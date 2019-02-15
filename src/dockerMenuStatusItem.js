/**
	Docker menu extension
	@author Guillaume Pouilloux <gui.pouilloux@gmail.com>
	@contributor Alexandre Filgueira <faidoc@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
**/

'use strict';

const Lang = imports.lang;
const GLib = imports.gi.GLib;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Docker = Me.imports.src.docker;

// Docker Service actions (start/stop)
const DockerMenuStatusItem = new Lang.Class({
    Name: 'DockerMenu.DockerMenuStatusItem',
    Extends: PopupMenu.PopupSwitchMenuItem,

    _init : function(itemLabel) {
        // Get current Docker status
        this.dockerStatus = this._getDockerStatus();
        log('Docker status: ' + this.dockerStatus);

        // Set Switch state
        this.parent(itemLabel, this.dockerStatus);

        this.connect('activate', Lang.bind(this, this._dockerAction));
    },

    _getDockerStatus: function() {
    	let statusCmd = 'sh -c "systemctl is-active docker.service --system; exit;"';
    	let res;
    	
    	return GLib.spawn_command_line_sync(statusCmd);
	},

	  _callbackDockerAction : function(funRes) {
        if (funRes['res']) {
            let msg = "`" + funRes['cmd'] + "` terminated successfully";
            log(msg);
        } else {
            let errMsg = "Error occurred when running `" + funRes['cmd'] + "`";
            Main.notify(errMsg);
            log(errMsg);
    	}
    },

    _dockerAction : function() {
        // TODO: Detect if systemctl and pkexec are installed
    	  let serviceAction = this.dockerStatus ? 'stop' : 'start';
        let dockerCmd = 'sh -c "pkexec --user root systemctl ' + serviceAction + ' docker.service --system; exit;"';
        let res;
        log("Let's " + serviceAction + " Docker...");
        Docker.async(function() {
            res = GLib.spawn_command_line_async(dockerCmd);
            return {
              cmd: dockerCmd,
              res: res
            };
        }, this._callbackDockerAction);
    }

});
