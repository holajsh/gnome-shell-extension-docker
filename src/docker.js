/*
 * Gnome3 Docker Menu Extension
 * Copyright (C) 2017 Guillaume Pouilloux <gui.pouilloux@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const dockerCommandsToLabels = {
    start: 'Start',
    stop: 'Stop',
    restart: 'Restart',
    pause: 'Pause',
    unpause: 'Unpause',
    rm: 'Remove',
    exec: 'Open Terminal'
};

/**
 * Check if docker is installed
 * @return {Boolean} whether docker is installed or not
 */
var isDockerInstalled = () => !!GLib.find_program_in_path('docker');

/**
 * Check if docker daemon is running
 * @return {Boolean} whether docker daemon is running or not
 */
var isDockerRunning = () => {
    const [res, pid, in_fd, out_fd, err_fd] = GLib.spawn_async_with_pipes(null, ['/bin/ps', 'cax'], null, 0, null);

    const outReader = new Gio.DataInputStream({
        base_stream: new Gio.UnixInputStream({ fd: out_fd })
    });

    let dockerRunning = false;
    let hasLine = true;
    do {
        const [out, size] = outReader.read_line(null);
        if (out && out.toString().indexOf("docker") > -1) {
            dockerRunning = true;
        } else if (size <= 0) {
            hasLine = false;
        }

    } while (!dockerRunning && hasLine);

    return dockerRunning;
};

/**
 * Get an array of containers
 * @return {Array} The array of containers as { name, status }
 */
var getContainers = () => {
    const [res, out, err, status] = GLib.spawn_command_line_sync("docker ps -a --format '{{.Names}},{{.Status}}'");
    if (status !== 0)
        throw new Error("Error occurred when fetching containers");

    return String.fromCharCode.apply(String, out).trim().split('\n')
        .filter((string) => string.length > 0)
        .map((string) => {
            const values = string.split(',');
            return {
                name: values[0],
                status: values[1]
            };
        });
};

/**
 * Run a docker command
 * @param {String} command The command to run
 * @param {String} containerName The container
 * @param {Function} callback A callback that takes the status, command, and stdErr
 */
var runCommand = (command, containerName, callback) => {
    // Form docker exec command or the regular one
    let cmd = '';

    if (command === 'exec') {
        // This line assumes /bin/bash exists on the container
        // TODO: use getDefaultTerminal() but for now "--" does not seem to work for x-terminal-emulator
        cmd +=  'gnome-terminal -- docker exec -it ' + containerName + ' /bin/bash';
    } else {
        cmd += "docker " + command + " " + containerName;
    }

    async(() => {
        const res = GLib.spawn_command_line_async(cmd);
        return { status: res, cmd: cmd };
    }, (res) => callback(res.status, res.cmd));
}

/**
 * Run a function in asynchronous mode using GLib
 * @param {Function} fn The function to run
 * @param {Function} callback The callback to call after fn
 */
var async = (fn, callback) => GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => callback(fn()));

/**
 * Get's the system's default terminal according to Gnome Shell DConf value
 *
 * @returns {string}
 */
function getDefaultTerminal() {
    let terminal = '';
    let res, out, err, status;
    let gsettingsCmd = 'gsettings get org.gnome.desktop.default-applications.terminal exec';
    [res, out, err, status] = GLib.spawn_command_line_sync(gsettingsCmd);

    if( status === 0 ) {
        let outStr = String.fromCharCode.apply(String, out);
        terminal = outStr.split('\n')[0].replace(/'/g, "");
    }

    return terminal;
}