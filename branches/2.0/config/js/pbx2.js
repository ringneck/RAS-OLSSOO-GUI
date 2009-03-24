/*
 * Asterisk-GUI	- an Asterisk configuration interface
 *
 * Core objects and utilities for their configs
 *
 * Copyright (C) 2006-2008, Digium, Inc.
 *
 * Ryan Brindley <ryan@digium.com>
 *
 * See http://www.asterisk.org for more information about
 * the Asterisk project. Please do not directly contact
 * any of the maintainers of this project for assistance;
 * the project provides a web site, mailing lists and IRC
 * channels for your use.
 *
 * This program is free software, distributed under the terms of
 * the GNU General Public License Version 2. See the LICENSE file
 * at the top of the source tree.
 *
 */

/**
 * The main config class.
 * This class contains all the objects of Asterisk that can be configured by the GUI.
 */
var pbx = {};

/*---------------------------------------------------------------------------*/
/**
 * Calling Rules object.
 */
pbx.calling_rules = {};

/**
 * Create a Calling Rule.
 * Copied from astgui_manageCallingRules.createCallingRule()
 * @param name The Calling Rule name
 * @param dp The Calling Rule dialplan string
 * @return boolean of success
 */
pbx.calling_rules.add = function(name, dp) {
	if (!name) {
		top.log.warn('pbx.calling_rules.add: name is not defined');
		return false;
	} else if (!dp) {
		top.log.warn('pbx.calling_rules.add: dp is not defined');
		return false;
	}

	if (!name.beginsWith(ASTGUI.contexts.CallingRulePrefix)) {
		name = ASTGUI.contexts.CallingRulePrefix + name;
	}

	dp = dp.lChop('exten=');

	var ext_conf = new listOfSynActions('extensions.conf');

	if (!sessionData.pbxinfo.callingRules.hasOwnProperty(name)) {
		ext_conf.new_action('delcat', name, '', ''); /* for good measure :) */
		ext_conf.new_action('newcat', name, '', '');
		sessionData.pbxinfo.callingRules[name] = [];
	}

	ext_conf.new_action('append', name, 'exten', dp);
	var resp = ext_conf.callActions();

	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.calling_rules.add: error adding ' + name + ' to extensions.conf');
		top.log.error(resp);
		return false;
	}

	sessionData.pbxinfo.callingRules[name].push('exten=' + dp);
	return true;
};

/**
 * Update a Calling Rule.
 * Copied from astgui_manageCallingRules.updateCallingRule()
 * @param name The Calling Rule name.
 * @param current The existing dialplan to be replaced.
 * @param edition The dialplan to replace existing.
 * @return boolean of success.
 */
pbx.calling_rules.edit = function(name, current, edition) {
	if (!name) {
		top.log.error('pbx.calling_rules.edit: uh oh, name is not defined!');
		return false;
	} else if (!current) {
		top.log.error('pbx.calling_rules.edit: uh oh, current is not defined!');
		return false;
	} else if (!edition) {
		top.log.error('pbx.calling_rules.edit: uh oh, edition is not defined!');
		return false;
	}

	var ext_conf = new listOfSynActions('extensions.conf');
	ext_conf.new_action('update', name, 'exten', edition.lChop('exten='), current.lChop('exten='));

	var resp = ext_conf.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.calling_rules.edit: error updating extensions.conf');
		top.log.error(resp);
		return false;
	}

	sessionData.pbxinfo.callingRules[name] = ASTGUI.cloneObject(sessionData.pbxinfo.callingRules[name]).replaceAB(current, edition);
	return true;
};

/**
 * Delete a Calling Rule.
 * Copied from astgui_manageCallingRules.deleteCallingRule().
 * @param name The Calling Rule name.
 * @param dp The Calling Rule string.
 * @return boolean of success.
 */
pbx.calling_rules.remove = function(name, dp) {
	if (!name) {
		top.log.warn('pbx.calling_rules.remove: name is not defined');
		return false;
	} else if (!sessionData.pbxinfo.callingRules.hasOwnProperty(name)) {
		top.log.warn('pbx.calling_rules.remove: ' + name + 'is not a calling rule in cached extensions.conf, likely not in real file as well. Proceeding with caution.');
	}

	dp = dp.lChop('exten=');

	var ext_conf = new listOfSynActions('extensions.conf');

	if (sessionData.pbxinfo.callingRules[name].length === 1 && sessionData.pbxinfo.callingRules[name][0] === 'exten=' + dp) {
		ext_conf.new_action('delcat', name, '', '');
		var resp = ext_conf.callActions();

		if (!resp.contains('Response: Success')) {
			top.log.error('pbx.calling_rules.remove: error removing from extensions.conf');
			return false;
		}

		delete sessionData.pbxinfo.callingRules[name];
	} else if (sessionData.pbxinfo.callingRules[name].length !== 1) {
		ext_conf.new_action('delete', name, 'exten', '', dp);
		var resp = ext_conf.callActions();

		if (!resp.contains('Response: Success')) {
			top.log.error('pbx.calling_rules.remove: error removing from extensions.conf');
			return false;
		}

		sessionData.pbxinfo.callingRules[name] = ASTGUI.cloneObject(sessionData.pbxinfo.callingRules[name]).withOut('exten=' + dp);
	} else {
		top.log.warn('pbx.calling_rules.remove: ' + name + ' exists, but does not contain ' + dp + '.');
	}

	return true;
};
/*---------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------*/
/**
 * Conferences object.
 */
pbx.conferences = {};

/**
 * Get a list of rooms.
 * @return array of conference rooms
 */
pbx.conferences.get = function() {
	if (!sessionData.pbxinfo.hasOwnProperty('conferences')) {
		return [];
	}

	var confs = [];
	for (var conf in sessionData.pbxinfo.conferences) {
		if (!sessionData.pbxinfo.conferences.hasOwnProperty(conf)) {
			continue;
		}

		confs.push(conf);
	}

	return confs;
};

/**
 * Load the Rooms.
 */
pbx.conferences.load = function() {
	var cxt = context2json({ filename: 'extensions.conf', context: ASTGUI.contexts.CONFERENCES, usf: 0});

	if (cxt === null) {
		var actions = new listOfSynActions('extensions.conf');
		actions.new_action('newcat', ASTGUI.contexts.CONFERENCES, '', '');
		actions.callActions();
		cxt = [];
	}
	cxt.each( function(line) {
		if (!line.beginsWith('exten=')) {
			return;
		}

		var exten = ASTGUI.parseContextLine.getExten(line);
		var options = line.afterChar('=');
		var params = options.betweenXY('|',')');
		
		if (params.contains('a') && params.contains('A')) {
			exten = ASTGUI.parseContextLine.getArgs(line)[0];
		}

		if (!sessionData.pbxinfo.conferences.hasOwnProperty(exten)) {
			sessionData.pbxinfo.conferences[exten] = new ASTGUI.customObject;
			sessionData.pbxinfo.conferences[exten]['configOptions'] = '';
			sessionData.pbxinfo.conferences[exten]['adminOptions'] = '';
			sessionData.pbxinfo.conferences[exten]['pwdString'] = '';
		}

		if (params.contains('a') && params.contains('A')) {
			sessionData.pbxinfo.conferences[exten]['adminOptions'] = options;
		} else {
			sessionData.pbxinfo.conferences[exten]['configOptions'] = options;
		}
	});

	var pwds = context2json({ filename: 'meetme.conf', context: 'rooms', usf:0});

	if (pwds === null) {
		var actions = new listofSynActions('meetme.conf');
		actions.new_action('newcat', 'rooms', '', '');
		actions.callActions();
		pwds = [];
	}

	pwds.each(function(line) {
		if (!line.beginsWith('conf=')) {
			return;
		}

		var name = line.betweenXY('=',',');
		name = name.trim();

		if(!sessionData.pbxinfo.hasOwnProperty(name)) {
			sessionData.pbxinfo.conferences[name] = new ASTGUI.customObject;
			sessionData.pbxinfo.conferences[name]['configOptions'] = '';
		}

		sessionData.pbxinfo.conferences[name]['pwdString'] = line.afterChar('=');
	});
};
/*---------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------*/
/**
 * Calling Plans object.
 */
pbx.call_plans = {};

/**
 * Add a Calling Plan.
 * @param name Calling Plan name.
 * @param callplan The Calling Plan.
 * @param callback Callback function.
 * @return boolean of success.
 */
pbx.call_plans.add = function(name, callplan, callback) {
	if (!name) {
		top.log.warn('pbx.call_plans.add: name is empty.');
		return false;
	} else if (!callplan) {
		top.log.warn('pbx.call_plans.add: callplan is empty.');
		return false;
	} else if (!callplan.includes) {
		top.log.warn('pbx.call_plans.add: callplan.includes is empty.');
		return false;
	}

	var actions = new listOfSynActions('extensions.conf');
	actions.new_action('delcat', name, '', '');
	actions.new_action('newcat', name, '', '');

	callplan.includes.each(function(cxt) {
		actions.new_action('append', name, 'include', cxt);
	});

	var resp = actions.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.call_plans.add: Error updating extensions.conf.');
		return false;
	}

	sessionData.pbxinfo.callingPlans[name] = callplan;
	if (callback) {
		callback();
	}

	return true;
};

/**
 * List Call Plans.
 * @return array of Call Plans.
 */
pbx.call_plans.list = function() {
	var list = [];

	for (var x in sessionData.pbxinfo.callingPlans) {
		if (!sessionData.pbxinfo.callingPlans.hasOwnProperty(x)) {
			continue;
		}

		list.push(x);
	}

	return list;
};

/**
 * Get Next Available Calling Plan.
 * @return next available calling plan.
 */
pbx.call_plans.nextAvailable = function() {
	var numbers = [];
	var cxt = ASTGUI.contexts.CallingPlanPrefix + 'DialPlan';
	var plans = this.list();

	plans.each(function(plan) {
		if (!plan.beginsWith(cxt)) {
			return;
		}

		var num = Number(plan.lChop(cxt));
		if (!isNaN(num)) {
			numbers.push(num);
		}
	});

	return 'DialPlan' + numbers.firstAvailable(1);
};

/**
 * Parse Call Plans context.
 * @param cxt Calling Plans context.
 * @return object of calling plan
 */
pbx.call_plans.parse = function(cxt) {
	if (!cxt) {
		top.log.warn('pbx.call_plans.parse: cxt is empty.');
		return null;
	}

	var dp = {};
	dp.includes = [];

	cxt.each(function(line) {
		if (line.beginsWith('include=')) {
			dp.includes.push(line.afterChar('='));
		}
	});

	return dp;
};

/**
 * Remove a Calling Plan.
 * @param name The Calling Plan name.
 * @return boolean of success.
 */
pbx.call_plans.remove = function(name) {
	if (!name) {
		top.log.warn('pbx.call_plans.remove: name is empty.');
		return false;
	}

	var actions = new listOfSynActions('extensions.conf');
	actions.new_action('delcat', name, '', '');

	var resp = actions.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.call_plans.remove: Error updating extensions.conf');
		return false;
	}

	delete sessionData.pbxinfo.callingPlans[name];
	return true;
};

/**
 * The Calling Rules object.
 * This object holds all the methods and members to manipulate calling rules
 * inside a calling plan.
 */
pbx.call_plans.rules = {};

/**
 * Add a Calling Rule.
 * @param callplan The Calling Plan.
 * @param rule The Calling Rule to add.
 * @return boolean of success.
 */
pbx.call_plans.rules.add = function(callplan, rule) {
	if (!callplan) {
		top.log.warn('pbx.call_plans.rules.remove: Callplan is empty.');
		return false;
	} else if (!rule) {
		top.log.warn('pbx.call_plans.rules.remove: Rule is empty.');
		return false;
	}

	var actions = new listOfSynActions('extensions.conf');
	actions.new_action('append', callplan, 'include', rule);

	var resp = actions.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.eror('pbx.call_plans.rules.add: Error updating extensions.conf');
		return false;
	}

	sessionData.pbxinfo.callingPlans[callplan].includes.push(rule);
	return true;
};

/**
 * Delete a Calling Rule.
 * @param callplan The Calling Plan to delete from.
 * @param rule The Calling Rule to delete.
 * @return boolean of success.
 */
pbx.call_plans.rules.remove = function(callplan, rule) {
	if (!callplan) {
		top.log.warn('pbx.call_plans.rules.remove: Callplan is empty.');
		return false;
	} else if (!rule) {
		top.log.warn('pbx.call_plans.rules.remove: Rule is empty.');
		return false;
	}

	var actions = new listOfSynActions('extensions.conf');
	actions.new_action('delete', callplan, 'include', '', rule);

	var resp = actions.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.call_plans.rules.remove: Error updating extensions.conf.');
		return false;
	}

	/* TODO: This is ugly, surely there is a better way */
	if (sessionData.pbxinfo.callingPlans[callplan].includes) {
		sessionData.pbxinfo.callingPlans[callplan].includes = sessionData.pbxinfo.callingPlans[callplan].includes.withOut(rule);
	}
	return true;
};
/*---------------------------------------------------------------------------*/

/**
 * Directory object.
 */
pbx.directory = {};

/**
 * Features object.
 */
pbx.features = {};

/**
 * Hardware object.
 */
pbx.hardware = {};

/**
 * Music On Hold object.
 */
pbx.moh = {};

/*---------------------------------------------------------------------------*/
/**
 * Paging object.
 */
pbx.paging = {};

/**
 * Add a Page Group.
 * @param line New Page Group Line.
 * @param callback Callback function.
 * @return boolean of success.
 */
pbx.paging.add = function(line, callback) {
	if (!line) {
		top.log.warn('pbx.paging.add: Line is empty.');
		return false;
	}

	var actions = new listOfSynActions('extensions.conf');
	actions.new_action('append', ASTGUI.contexts.PageGroups, 'exten', line);

	var resp = actions.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.paging.add: Error updating extensions.conf.');
		return false;
	}

	this.updateCache(callback);
	return true;
};

/**
 * List Page Groups.
 * @return an array of page groups.
 */
pbx.paging.list = function() {
	var cxt = sessionData.pbxinfo['pagegroups'];
	var extens = [];
	cxt.each(function(line) {
		var exten = ASTGUI.parseContextLine.getExten(line);
		if (exten) {
			extens.push(exten);
		}
	});

	return extens;
};

/**
 * Delete a Page Group.
 * @param exten The Page Group extension.
 * @param callback The Callback function.
 * @return boolean of success.
 */
pbx.paging.remove = function(exten, callback) {
	var cache = this.updatePGsCache;
	ASTGUI.misFunctions.delete_LinesLike({ 
		context_name: ASTGUI.contexts.PageGroups, 
		beginsWithArr: ['exten=' + pgexten + ','], 
		filename: 'extensions.conf', 
		hasThisString: 'Macro(', 
		cb: function(){AF(cb);}
	});
};

/**
 * Update Page Group Cache.
 * @param callback Callback Function
 */
pbx.paging.updateCache = function(callback) {
	setTimeout(function() {
		sessionData.pbxinfo['pagegroups'] = context2json({filename: 'extensions.conf', context: ASTGUI.contexts.PageGroups, usf:0});
	}, 1000);
};
/*---------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------*/
/**
 * Queues object.
 */
pbx.queues = {};

/**
 * Load Queues.
 * @return boolean of success.
 */
pbx.queues.load = function() {
	var cxt = context2json({ filename: 'extensions.conf', context: ASTGUI.contexts.QUEUES, usf:o});
	if (cxt === null) {
		top.log.info('pbx.queues.load: context not found, lets create it!');
		var ext_conf = new listofSynActions('extensions.conf');
		ext_conf.new_action('newcat', ASTGUI.contexts.QUEUES, '', '');

		var resp = ext_conf.callActions();
		if (!resp.contains('Response: Success')) {
			top.log.error('pbx.queues.load: error updating extensions.conf');
			return false;
		}

		cxt = [];
		return true;
	}

	cxt.each(function(line) {
		if (!line.beginsWith('exten=')) {
			return;
		}

		var exten = ASTGUI.parseContextLine.getExten(line);
		var config = line.afterChar('=');

		if (!sessionData.pbxinfo.queues.hasOwnProperty(exten)) {
			sessionData.pbxinfo.queues[exten] = new ASTGUI.customObject;
		}

		sessionData.pbxinfo.queues[exten]['configLine'] = config;
	});

	return true;
};
/*---------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------*/
/**
 * Ring Groups object.
 */
pbx.ring_groups = {};

/**
 * Add a new Ring Group.
 * @param name Ring Group name.
 * @param rg Ring Group object.
 * @param callback Callback function.
 * @return boolean on success.
 */
pbx.ring_groups.add = function(name, rg, callback) {
	name = name || this.next();
	rg.fallback = rg.fallback || 'Hangup';
	var ignore = (rg.ignore) ? '${DIALOPTIONS}i' : '${DIALOPTIONS}';

	var actions = new listOfSynActions('extensions.conf');
	actions.new_action('newcat', name, '', '');
	actions.new_action('append', name, 'exten', 's,1,NoOp(' + rg.NAME + ')');

	if (rg.strategy === 'ringinorder') {
		rg.members.each(function(member) {
			actions.new_action('append', name, 'exten', 's,n,Dial(' + member + ',' + rg.ringtime + ',' + ignore + ')');
		});
	} else {
		if (rg.members.length) {
			actions.new_action('append', name, 'exten', 's,n,Dial(' + rg.members.join('&') + ',' + rg.ringtime + ',' + ignore + ')');
		}
	}

	actions.new_action('append', name, 'exten', 's,n,' + rg.fallback);

	var resp = actions.callActions();

	if (!rest.contains('Response: Success')) {
		top.log.error('pbx.ring_groups.add: error updating extensions.conf');
		return false;
	}

	if (rg.extension) {
		actions.clearActions();
		actions.new_action('append', ASTGUI.contexts.RingGroupExtensions, 'exten', rg.extension + ',1,Goto(' + name + ',s,1)');
		actions.callActions();
	}
	
	sessionData.pbxinfo.ringgroups[name] = rg;
	callback();
	return true;
};

/**
 * List Ring Groups.
 * @return array of ring groups.
 */
pbx.ring_groups.list = function() {
	var list = [];
	var rgs = sessionData.pbxinfo.ringgroups;

	for (var rg in rgs) {
		if (rgs.hasOwnProperty(rg)) {
			list.push(rg);
		}
	}

	return list;
};

/**
 * Parse Ring Groups' context.
 * @param cxt_name Context name.
 * @param cxt Context.
 * @param extens Ring Group extensions.
 * @return ring group object.
 */
pbx.ring_groups.parse = function(cxt_name, cxt, extens) {
	if (!cxt_name) {
		top.log.error('pbx.ring_groups.parse: cxt_name is empty.');
		return null;
	} else if (!cxt) {
		top.log.error('pbx.ring_groups.parse: cxt is empty.');
		return null;
	} else if (!extens) {
		top.log.error('pbx.ring_groups.parse: extens is empty.');
		return null;
	}

	var rg = new ASTGUI.customObject;
	rg.name = '';
	rg.members = [];
	rg.strategy = '';
	rg.ignore = true;

	if (cxt[0].contains('exten=s,1') && cxt[0].toLowerCase().contains('noop(')) {
		/* TODO: this is clearly a bad assumption for those who might want
		 * to edit this ring group. We need to strengthen this */
		rg.name = cxt[0].betweenXY('(', ')');
		cxt.splice(0,1);
	} else {
		rg.name = 'RingGroup ' + cxt_name.withOut(ASTGUI.contexts.RingGroupPrefix);
	}

	var dialcount = 0;
	cxt.each(function(line) {
		/* check for old gui ring group name */
		if (line.beginsWith('gui_ring_groupname=')) {
			rg.name = line.afterChar('=');
			return;
		}

		if (line.toLowerCase().contains('dial(')) {
			dialcount++;
			var args = ASTGUI.parseContextLine.getArgs(line);
			if (args[0].contains('&')) {
				rg.members = rg.members.concat(args[0].split('&'));
			} else {
				rg.members.push(args[0]);
			}

			rg.ringtime = args[1];
			rg.ignore = (args[2] && args[2].contains('i')) ? true : false;
		}
	});

	rg.strategy = (dialcount > 1) ? 'ringinorder' : 'ringall';
	var lastline = cxt[cxt.length-1].toLowerCase();
	if (!lastline.contains('dial(') && lastline.beginsWith('exten=s,n')) {
		rg.fallback = cxt[cxt.length-1].split('=s,n,')[1];
	}

	for (var a=0; a<extens.length; a++) {
		if (extens[a].contains(cxt_name + '|') && extens[a].contains(cxt_name + ',')) {
			rg.extension = ASTGUI.parseContextLine.getExten(extens[a]);
			break;
		}
	}

	return rg;
};

/**
 * Next available ring group number.
 * @return next available ring group number.
 */
pbx.ring_groups.next = function() {
	var x = [];
	var y = this.list();

	y.each(function(rg) {
		if (rg.beginsWith(ASTGUI.contexts.RingGroupPrefix)) {
			x.push(rg.split(ASTGUI.contexts.RingGroupPrefix)[1]);
		}
	});

	if (!x.length) {
		return ASTGUI.contexts.RingGroupPrefix + '1';
	}

	return ASTGUI.contexts.RingGroupPrefix + x.firstAvailable();
};

/**
 * Delete a ring group.
 * @param name Name of Ring Group.
 * @return boolean on success.
 */
pbx.ring_groups.remove = function(name) {
	var actions = new listOfSynActions('extensions.conf');
	actions.new_action('delcat', name, '', '');

	if (sessionData.pbxinfo.ringgroups[name].extension) {
		var exten = sessionData.pbxinfo.ringgroups[name].extension;
		actions.new_action('delete', ASTGUI.contexts.RingGroupExtensions, 'exten', '', exten + ',1,Goto(' + name + ',s,1)');

		if (sessionData.pbxinfo.ringgroups[name].hasOwnProperty('isOLDRG') && sessionData.pbxinfo.ringgroups[name].isOLDRG === true) {
			actions.new_action('delete', 'default', 'exten', '', exten + ',1,Goto(' + name + '|s|1)');
		}
	}

	var resp = actions.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.ring_groups.remove: error updating extensions.conf');
		return false;
	}

	delete sessionData.pbxinfo.ringgroups[name];
	return true;
};
/*---------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------*/
/**
 * Time Interval object.
 */
pbx.time_intervals = {};

/**
 * Add a Time Interval.
 * @param name Name of the Interval.
 * @param interval contains: time, weekdays, days, months
 * @return boolean on success.
 */
pbx.time_intervals.add = function(name, interval) {
	/* check the basics */
	if (!name) {
		top.log.error('pbx.time_intervals.add: name is empty.');
		return false;
	} else if (typeof interval === 'undefined') {
		top.log.error('pbx.time_intervals.add: interval is undefined.');
		return false;
	}

	/* validate the name */
	if (name.contains(' ')) {
		top.log.error('pbx.time_intervals.add: name contains spaces.');
		return false;
	}
	/* we need to check for existing time_intervals with the same name
	 * to do this, we first must make an array holding all the
	 * time_intervals. */

	/* set defaults. can't loop through members, that assumes they exist. */
	interval.time = interval.time || '*';
	interval.weekdays = interval.weekdays || '*';
	interval.days = interval.days || '*';
	interval.months = interval.months || '*';

	/* validate all the args */
	if (!this.validate.time(interval.time)) {
		top.log.error('pbx.time_intervals.add: invalid time.');
		return false;
	} else if (!this.validate.weekday(interval.weekdays)) {
		top.log.error('pbx.time_intervals.add: invalid days of the week.');
		return false;
	} else if (!this.validate.day(interval.days)) {
		top.log.error('pbx.time_intervals.add: invalid day.');
		return false;
	} else if (!this.validate.month(interval.months)) {
		top.log.error('pbx.time_intervals.add: invalid month.');
		return false;
	}

	/* create the time interval string */
	var value = interval.time.toString() + top.session.delimiter
		+ interval.weekdays.toString() + top.session.delimiter
		+ interval.days.toString() + top.session.delimiter
		+ interval.months.toString();

	/* update extensions.conf */
	var ext_conf = new listOfSynActions('extensions.conf');
	ext_conf.new_action('update', 'globals', ASTGUI.contexts.TimeIntervalPrefix + name, value);

	var resp = ext_conf.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.time_intervals.add: error updating extensions.conf');
		return false;
	}

	/* TODO: add new time interval to gui cache */

	ASTGUI.feedback({ msg: 'Created time interval!', showfor: 3, color: 'green', bgcolor: '#ffffff'});
	return true;
};

/**
 * Edit a Time Interval.
 * @param oldname Old Name of the Interval.
 * @param newname New Name of the Interval.
 * @param interval contains: time, weekdays, days, months
 * @return boolean on success.
 */
pbx.time_intervals.edit = function(oldname, newname, interval) {
	/* check the basics */
	if (!newname) {
		top.log.error('pbx.time_intervals.add: name is empty.');
		return false;
	} else if (typeof interval === 'undefined') {
		top.log.error('pbx.time_intervals.add: interval is undefined.');
		return false;
	}

	/* validate the name */
	if (newname.contains(' ')) {
		top.log.error('pbx.time_intervals.add: name contains spaces.');
		return false;
	}

	/* set defaults. can't loop through members, that assumes they exist. */
	interval.time = interval.time || '*';
	interval.weekdays = interval.weekdays || '*';
	interval.days = interval.days || '*';
	interval.months = interval.months || '*';

	/* validate all the args */
	if (!this.validate.time(interval.time)) {
		top.log.error('pbx.time_intervals.add: invalid time.');
		return false;
	} else if (!this.validate.weekday(interval.weekdays)) {
		top.log.error('pbx.time_intervals.add: invalid days of the week.');
		return false;
	} else if (!this.validate.day(interval.days)) {
		top.log.error('pbx.time_intervals.add: invalid day.');
		return false;
	} else if (!this.validate.month(interval.months)) {
		top.log.error('pbx.time_intervals.add: invalid month.');
		return false;
	}

	/* create the time interval string */
	var value = interval.time.toString() + top.session.delimiter
		+ interval.weekdays.toString() + top.session.delimiter
		+ interval.days.toString() + top.session.delimiter
		+ interval.months.toString();

	/* update extensions.conf */
	var actions = new listOfSynActions('extensions.conf');
	actions.new_action('delete', 'globals', ASTGUI.contexts.TimeIntervalPrefix + oldname, '', '');

	var exten_conf = config2json({filename:'extensions.conf', usf:0});
	for (var cxt in exten_conf) {
		if (!exten_conf.hasOwnProperty(cxt)) {
			continue;
		}

		if (cxt.beginsWith(ASTGUI.contexts.TrunkDIDPrefix) && !cxt.contains('_' + ASTGUI.contexts.TimeInteralPrefix)) {
			var lines = exten_conf[cxt];
			lines.each(function(line) {
				if (line.beginsWith('include=') && line.contains(ASTGUI.contexts.TrunkDIDPrefix) && (line.contains(oldname + ',${') || line.contains(oldname + '|${'))) {
					actions.new_action('update', cxt, 'include', line.afterChar('=').replaceXY(oldname, newname), line.afterChar('='));
				}
			});
		}

		if (cxt.beginsWith(ASTGUI.contexts.TrunkDIDPrefix) && cxt.endsWith(oldname)) {
			actions.new_action('renamecat', cxt, '', cxt.replace(oldname, newname));
		}
	}

	actions.new_action('append', 'globals', ASTGUI.contexts.TimeIntervalPrefix + newname, value);
	var resp = actions.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.time_intervals.add: error updating extensions.conf');
		return false;
	}

	/* TODO: add new time interval to gui cache */

	ASTGUI.feedback({ msg: 'Updated time interval!', showfor: 3, color: 'green', bgcolor: '#ffffff'});
	return true;
};

/**
 * Delete a Time Interval.
 * @param name.
 * @return boolean on success.
 */
pbx.time_intervals.remove = function(name) {
	if (!name) {
		top.log.warn('pbx.time_intervals.remove: Name is empty.');
		return false;
	}

	var actions = new listOfSynActions('extensions.conf');
	actions.new_action('delete', 'globals', t, '', '');

	var exten_conf = config2json({filename: 'extensions.conf', usf:0});
	for (var cxt in exten_conf) {
		if (!exten_conf.hasOwnProperty(cxt)) {
			continue;
		}

		if (cxt.beginsWith(ASTGUI.contexts.TrunkDIDPrefix) && !cxt.contains(ASTGUI.contexts.TimeIntervalPrefix)) {
			var did = exten_conf[cxt];
			did.each(function(line) {
				if (line.beginsWith('include=') && line.contains(ASTGUI.contexts.TrunkDIDPrefix) && line.contains(ASTGUI.contexts.TimeIntervalPrefix)) {
					actions.new_action('delete', cxt, 'include', '', line.afterChar('='));
				}
			});
		}
	}

	var resp = actions.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.time_intervals.remove: error updating extensions.conf.');
		return false;
	}

	ASTGUI.feedback({ msg: 'Deleted time interval!', showfor: 3, color: 'green', bgcolor: '#ffffff'});
	return true;
};

/**
 * Validater object.
 * Holds members funcs that validate various formats
 * needed for time_intervals.
 */
pbx.time_intervals.validate = {
	days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
	months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

};

/**
 * Validates day format.
 * @param day The day to be checked.
 * @return boolean on valid format.
 */
pbx.time_intervals.validate.day = function (day) {
	if (day === '*') {
		return true;
	}

	day = parseInt(day, 10);
	if (day >= 0 && day <= 31) {
		return true;
	}

	return false;
};

/**
 * Validates month format.
 * @param month The month to be checked.
 * @return boolean on valid format.
 */
pbx.time_intervals.validate.month = function (month) {
	if (month === '*' || this.months.contains(month)) {
		return true;
	}

	return false;
};

/**
 * Validates Time format.
 * @param time The time to be checked.
 * @return boolean on valid format.
 */
pbx.time_intervals.validate.time = function (time) {
	if (time === '*') {
		/* this condition was separated from the switch
		 * because its the one condition that doesn't
		 * verify 00:00-00:00 format */
		return true;
	}

	var splits = time.split('-');
	var start = splits[0];
	var end = splits[1];
	splits = start.split(':');
	var start_hr = splits[0];
	var start_min = splits[1];
	var i_start_hr = parseInt(start_hr, 10);
	var i_start_min = parseInt(start_min, 10);
	splits = end.split(':');
	var end_hr = splits[0];
	var end_min = splits[1];
	var i_end_hr = parseInt(end_hr, 10);
	var i_end_min = parseInt(end_min, 10);

	switch(true) {
		case (time === ''):
		case (time.length !== 11):
		case (start_hr.length !== 2):
		case (start_min.length !== 2):
		case (end_hr.length !== 2):
		case (end_min.length !== 2):
		case (i_start_hr < 0):
		case (i_start_hr > 24):
		case (i_start_min < 0):
		case (i_start_min > 60):
		case (i_end_hr < 0):
		case (i_end_hr > 24):
		case (i_end_min < 0):
		case (i_end_min > 60):
		case (i_start_hr*60 + i_start_min > i_end_hr*60 + i_end_min):
		case (i_start_hr === 24 && i_start_min > 0):
		case (i_end_hr === 24 && i_start_min > 0):
			return false;
		default:
			return true;
	}
};

/**
 * Validates Weekday format.
 * @param week The weekday range to be checked.
 * @return boolean on valid format.
 */
pbx.time_intervals.validate.weekday = function(week) {
	if (week === '*') {
		/* this condition was separated from the switch
		 * because its its own condition */
		return true;
	}

	if (week.contains('-') && week[3] !== '-') {
		return false;
	} else if (week[3] === '-') {
		var first = week.split('-')[0];
		var second = week.split('-')[1];

		if (!this.days.contains(first) || !this.days.contains(second)) {
			return false;
		}
	} else {
		if (!this.days.contains(week)) {
			return false;
		}

	}

	return true;
};
/*---------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------*/
/**
 * Trunks object.
 */
pbx.trunks = {
	trunk_types: ['analog', 'bri', 'iax', 'pri', 'provider', 'sip']
};

/**
 * Add a trunk.
 * @param type type of trunk.
 * @param trunk trunk object.
 * @param callback the callback function
 * @param basis IAX/SIP, basis of trunk addition.
 * @return boolean on success.
 */
pbx.trunks.add = function(type, trunk, callback, basis) {
	var chans;
	var ct = '';
	var group = '';
	var name = trunk.username;

	/* The first thing we must do is verify required vars and
	 * do some general prep work depending on type */
	switch(type) {
	case 'analog':
		if (!trunk.hasOwnProperty('zapchan') && !trunk.hasOwnProperty('dahdichan')) {
			top.log.error('pbx.trunks.add: required variable zapchan/dahdichan not found.');
			return false;
		}

		chans = trunk.zapchan || trunk.dahdichan;
		delete trunk.zapchan;
		delete trunk.dahdichan;

		name = astgui_managetrunks.misc.nextAvailableTrunk_x();
		group = astgui_managetrunks.misc.nextAvailableGroup();

		trunk.signalling = '';
		trunk.channel = '';
		var zap_channels = ASTGUI.miscFunctions.chanStringtoArray(chans);
		zap_channels.each(function(ch) {
			var ls = ASTGUI.cloneObject(sessionData.PORTS_SIGNALLING.ls);
			var sg = (ls.contains(ch)) ? 'fxs_ls' : 'fxs_ks';
		});

		break;
	case 'iax':
	case 'sip':
		if (!trunk.hasOwnProperty('host')) {
			top.log.error('pbx.trunks.add: required variable host not found.');
			return false;
		}

		if (basis === 'GUIAssigned') {
			name = astgui_managetrunks.misc.nextAvailableTrunk_x();
		} else if (basic === 'FromProvider') {
			name = trunk.trunkname;
		}
		break;
	default:
		break;
	}

	if (name === '') {
		top.log.error('pbx.trunks.add: expected name to be defined.');
		return false;
	}
	ct = ASTGUI.contexts.TrunkDIDPrefix + name;

	/* Now, lets set some defaults for the essentials */
	trunk.allow = 'all';
	trunk.context = ct || '';
	trunk.disallow = 'all';
	trunk.group = group || null;
	//DahdiChannelString ???
	trunk.hasexten = 'no';
	trunk.hasiax = trunk.hasiax || 'no';
	trunk.hassip = trunk.hassip || 'no';
	trunk.registeriax = trunk.hasiax || 'no';	/* same conditions as hasiax */
	trunk.registersip = (trunk.host === 'dynamic' && trunk.hassip) ? 'no' : 'yes';
	trunk.trunkname = (trunk.trunkname) ? trunk.trunkname.guiMetaData() : '';
	trunk.trunkstyle = (type === 'analog') ? type.guiMetaData() : 'voip'.guiMetaData();

	/* Initializing astman interactions */
	var users_conf = new listOfActions();
	users_conf.filename('users.conf');

	users_conf.new_action('delcat', name, '', ''); /* for good measure :) */
	users_conf.new_action('newcat', name, '', '');

	/* now, lets iterate thru and append to the trunk context! */
	for (var v in trunk) {
		if (!trunk.hasOwnProperty(v)) {
			continue;
		}

		sessionData.pbxinfo.trunks[type][name][v] = trunk[v];
		users_conf.new_action('append', name, v, trunk[v]);
	}

	var resp = users_conf.callActions();

	/* Not good! an error!! */
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.trunks.add: error adding trunk to users.conf');
		top.log.error(resp);
		delete sessionData.pbxinfo.trunks[type][name];
		return false;
	}

	/* users.conf changes down, now to add to extensions.conf */
	var ext_conf = new listOfSynActions('extensions.conf');

	ext_conf.new_action('delcat', ct, '', ''); /* for good measure :) 2.0 */
	ext_conf.new_action('newcat', ct, '', '');
	ext_conf.new_action('delcat', ct + ASTGUI.contexts.TrunkDefaultSuffix, '' ,'');
	ext_conf.new_action('newcat', ct + ASTGUI.contexts.TrunkDefaultSuffix, '', '');
	ext_conf.new_action('append', ct, 'include', ct + ASTGUI.contexts.TrunkDefaultSuffix);
	ext_conf.new_action('update', 'globals', trunk, this.technology[type] + '/' + name);

	resp = '';
	resp = ext_conf.callActions();

	/* Not good! an error!! */
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.trunks.add: error adding trunk to extensions.conf');
		top.log.error(resp);
		top.log.debug('pbx.trunks.add: removing entree in users.conf due to error.');

		users_conf.clearActions();
		users_conf.new_action('delcat', name, '', '');
		users_conf.callActions(); /* Not going to bother catching errors */

		delete sessionData.pbxinfo.trunks[type][name];
		return false;
	}

	callback();
};

/**
 * Get Trunk Details.
 * @param trunk
 * @return an object with the trunk details, or null.
 */
pbx.trunks.get = function(trunk) {
	try {
		var x = null;
		var tr = new ASTGUI.customObject;

		for (var i=0; i<this.trunk_types.length; i++) {
			var type = this.trunk_types[i];

			if (sessionData.pbxinfo.trunks[type].hasOwnProperty(trunk)) {
				x = sessionData.pbxinfo.trunks[type];
			}
		}

		if (x === null) {
			return x;
		}

		for (var d in x) {
			if (!x.hasOwnProperty(d)) {
				continue;	
			}

			tr[d] = x[d];
		}

		return tr;
	} catch(err) {
		top.log.error('pbx.trunks.get: ' + err);
		return null;
	}
};

/**
 * Get Trunk Name.
 * @param name.
 * @return trunk name.
 */
pbx.trunks.getName = function(trunk) {
	if (trunk === 'Skype') {
		return trunk;
	}

	for (var i=0; i < this.trunk_types.length; i++) {
		if (sessionData.pbxinfo.trunks[this.trunk_types[i]][trunk]) {
			if (this.trunk_types[i] === 'bri' && sessionData.pbxinfo.trunks[this.trunk_types[i]][trunk].trunkname) {
				return 'BRI - ' + sessionData.pbxinfo.trunks[this.trunk_types[i]][trunk].trunkname;
			}
			return sessionData.pbxinfo.trunks[this.trunk_types[i]][trunk].trunkname || trunk;
		}
	}

	top.log.warn('pbx.trunks.getType: No trunk name found.');
	top.log.warn('pbx.trunks.getType: Trunk, ' + trunk + ', most like doesn\'t exist');
	return null;
};

/**
 * Get Provider Trunk Type.
 * @param trunk.
 * @return provider type.
 */
pbx.trunks.getProviderType = function(trunk) {
	if (!sessionData.pbxinfo.trunks.providers.hasOwnProperty(trunk)) {
		top.log.error('pbx.trunks.getProviderType: ' + trunk + ' is not a provider.');
		return '';
	}

	var provider = sessionData.pbxinfo.trunks.providers[trunk];
	if (provider.hasOwnProperty('hassip') && provider.hassip.isAstTrue()) {
		return 'sip';
	} else if (provider.hasOwnProperty('hasiax') && provider.hasiax.isAstTrue()) {
		return 'iax';
	} else {
		top.log.warn('pbx.trunks.getProviderType: Unexpected - ' + trunk + ' is not type iax or sip');
		return '';
	}

};

/**
 * Get Trunk Type.
 * @param trunk.
 * @return type of trunk.
 */
pbx.trunks.getType = function(trunk) {
	for (var i=0; i < this.trunk_types.length; i++) {
		if (sessionData.pbxinfo.trunks[this.trunk_types[i]][trunk]) {
			return this.trunk_types[i];
		}
	}

	top.log.warn('pbx.trunks.getType: No trunk type found.');
	top.log.warn('pbx.trunks.getType: Trunk, ' + trunk + ', most like doesn\'t exist');
	return null;
};

/**
 * List trunks.
 * This function takes an object as an argument and cycles through 
 * @param types This is the object holding all the types to be listed.
 * @return an array of all the trunks.
 */
pbx.trunks.list = function(types) {
	var trunks = [];
	if (typeof types === 'undefined') {
		top.log.warn('pbx.trunks.list: types is undefined');
		return null;
	}

	if (types.all) {
		delete types;
		types = {};
		types.analog = true;
		types.bri = true;
		types.iax = true;
		types.pri = true;
		types.provider = true;
		types.sip = true;
	}

	for (var type in types) {
		if (!types.hasOwnProperty(type) || type === 'all' ||  types[type] === false) {
			continue;
		}

		if (!sessionData.pbxinfo.trunks.hasOwnProperty(type)) {
			top.log.debug('pbx.trunks.list: ' + type + 'is not a type of trunk.');
			continue;
		}

		try {
			for (var item in sessionData.pbxinfo.trunks[type]) {
				if (!sessionData.pbxinfo.trunks[type].hasOwnProperty(item)) {
					continue;
				}

				trunks.push(item);
			}
		} catch(err) {
			top.log.error('pbx.trunks.list: ' + err);
		}
	}
};

/**
 * Get next available group.
 * @return first available group, or null on error.
 */
pbx.trunks.nextAvailGroup = function() {
	var nums = [];
	var trunks = this.list({analog: true, pri: true});
	var type = 'analog';

	if (!trunks.length) {
		top.log.warn('pbx.trunks.nextAvailGroup: no trunks');
		return null;
	}

	trunks.each(function(trunk) {
		type = (sessionData.pbxinfo.trunks['analog'].hasOwnProperty(trunk)) ? 'analog' : 'pri';
		nums.push(sessionData.pbxinfo.trunks[type][trunk]['group']);
	});

	return nums.firstAvailable();
};

/**
 * Get next available trunk number.
 * @return first available trunk number.
 */
pbx.trunks.nextAvailTrunk = function() {
	var numbers = [];
	var trunks = this.list();

	trunks.each(function(trunk) {
		if (trunk.beginsWith('trunk_')) {
			numbers.push(trunk.split('trunk_')[1]);
		}
	});

	return (!x.length) ? 'trunk_1' : 'trunk_' + numbers.firstAvailable();
};

/**
 * Delete a trunk
 * @param trunk The trunk name
 */
pbx.trunks.remove = function(trunk) {
	var actions = new listOfSynActions('users.conf');
	actions.new_action('delcat', trunk, '', '');
	actions.callActions();
	delete actions;

	var exts = config2json({filename: 'extensions.conf', usf:0});
	var actions = new listOfSynActions('extensions.conf');
	actions.new_action('delete', 'globals', trunk, '');

	for (var trunk in exts) {
		if (!exts.hasOwnProperty(trunk)) {
			continue;
		}

		actions.new_action('delcat', trunk, '', '');
	}
	actions.callActions();

	try {
		for (var i=0; i<this.trunk_types.length; i++) {
			delete sessionData.pbxinfo.trunks[this.trunk_types[i]][trunk];
		}
	} catch(err) {
		top.log.error(err);
		return false;
	}

	return true;
};
/*---------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------*/
/**
 * Users object.
 */
pbx.users = {};

/**
 * Add a user.
 * This function adds a user to the system, updating the gui's cache first
 * and then Asterisk.
 * WARNING: This function also deletes any existing user with the same exten.
 * @param exten The user's extension.
 * @param info All the properties of the user.
 * @param callback The callback function once the user has been added.
 */
pbx.users.add = function(exten, info, callback) {
	info = ASTGUI.toCustomObject(info);

	var disallow = info.getProperty('disallow') || 'all';
	var allow = info.getProperty('allow') || 'all';
	sessionData.pbxinfo['users'][exten] = info;
	sessionData.pbxinfo['users'][exten]['disallow'] = disallow;
	sessionData.pbxinfo['users'][exten]['allow'] = allow;
	sessionData.pbxinfo['users'][exten]['mailbox'] = info.mailbox || exten;
	sessionData.pbxinfo['users'][exten]['call-limit'] = '100';

	delete info.disallow;
	delete info.allow;

	var x = new listOfActions();
	x.filename('users.conf');
	x.new_action('delcat', exten, '', '');
	x.new_action('newcat', exten, '', '');
	x.new_action('append', exten, 'username', exten);
	x.new_action('append', exten, 'transfer', 'yes');
	x.new_action('append', exten, 'disallow', disallow);
	x.new_action('append', exten, 'allow', allow);
	x.new_action('append', exten, 'mailbox', info.mailbox || exten);
	x.new_action('append', exten, 'call-limit', '100');

	if (info.mailbox) {
		delete info.mailbox;
	}

	if (info.hasOwnProperty('hassip') && info['hassip'].isAstTrue()) {
		x.new_action('append', exten, 'host', dynamic);
	}

	for (var prop in info) {
		if (info.hasOwnProperty(prop)) {
			x.new_action('append', exten, prop, info[prop]);
		}
	}

	x.callActions(callback);
};

/**
 * Edit User Properties.
 * @param user The user.
 * @param info An object holding the var and vals of properties to be edited.
 */
pbx.users.edit = function(user, info) {
	if (!sessionData.pbxinfo['users'][p.user]) {
		top.log.debug('pbx.users.edit: User not found, exiting.');
		return false;
	}

	for (var prop in info) {
		if (info.hasOwnProperty(prop)) {
			var val = info[prop];
			var u = ASTGUI.updateaValue({ file: 'users.conf', context: user, variable: prop, value: val});

			if (u) {
				try {
					sessionData.pbxinfo['users'][user][prop] = val;
				} catch (err) {
					top.log.error('pbx.users.edit: ' + err);
				}
			} 
		}
	}

	return true;
};

/**
 * Get User Details
 * @param user The user to get.
 */
pbx.users.get = function() {
	if (!sessionData.pbxinfo.users[user]) {
		top.log.debug('pbx.users.get: User not found.');
		return null;
	}

	return sessionData.pbxinfo.users[user];
};

/**
 * List users.
 */
pbx.users.list = function() {
	return ( sessionData.pbxinfo.users && sessionData.pbxinfo.users.getOwnProperties && sessionData.pbxinfo.users.getOwnProperties() ) || [];
};

/**
 * Remove user.
 * @param user The user.
 * @param vmdel Optional, default = false. Boolean to delete vms or not.
 * @param callback Optional, default = null. The callback function after deleting a user.
 * @return boolean of success.
 */
pbx.users.remove = function(params) {
	if (typeof params !== 'object') {
		top.log.error('pbx.users.remove: Expecting params to be an object.');
		return false;
	} else if (typeof params.user === 'undefined') {
		top.log.error('pbx.users.remove: params.user is empty.');
		return false;
	} else if (params.vmdel === 'undefined') {
		top.log.error('pbx.users.remove: params.vmdel is empty.');
		return false;
	}

	var actions = new listOfSynActions('users.conf');
	actions.new_action('delcat', params.user, '', '');
	var resp = actions.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.users.remove: Error removing ' + params.user + ' from users.conf.');
		return false;
	}

	actions.clearActions('extensions.conf');
	actions.new_action('delete', 'globals', ASTGUI.globals.odcidUsrPrefix + params.user, '');
	var resp = actions.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.users.remove: Error removing global var: "' + ASTGUI.globals.odcidUsrPrefix + params.user + '" from extensions.conf.');
		return false;
	}

	delete sessionData.pbxinfo['users'][params.user];

	var qs_x = new listOfActions('queues.conf');
	var qs = config2json({filename: 'queues.conf', usf:0});
	for (var i in qs) {
		if (!qs.hasOwnProperty(i)) {
			continue;
		}

		if (qs[i].contains('member=Agent/' + params.user) ) {
			qs_x.new_action('delete', i, 'member', '', 'Agent/' + params.user);
		}
	}

	qs_x.callActions(function() {
		if (params.vmdel) {
			ASTGUI.systemCmd('rm ' + top.sessionData.directories.voicemails_dir + params.user + ' -rf', function(){});
		} 
	});

	params.callback();
};

/**
 * Get a User's Status.
 * copied from ASTGUI.getUser_DeviceStatus.
 * @param user The User's Extension.
 * @return [FBUR] depending on the status
 */
pbx.users.state = function(user) {
	user = (typeof user === 'number') ? String(user) : user;
	if (typeof user !== 'string') {
		top.log.warn('pbx.users.state: Expecting user to be a String.');
		return 'U';
	}

	var req = top.astman.makeSyncRequest({action: 'ExtensionState', Exten: user});
	switch(true) {
		case t.contains('Status: 0'): /* No Device is Busy/InUse */
			return 'F';
		case t.contains('Status: 1'): /* 1+ Devices Busy/InUse */
		case t.contains('Status: 2'): /* all Devices Busy/InUse */
			return 'B';
		case t.contains('Status: 8'): /* all Devices Ringing */
			return 'R';
		case t.contains('Status: 4'): /* All devices unavailable/unregistered */
		default:
			return 'U';
	}
};

/**
 * Get a User's Status Image.
 * copied from ASTGUI.getUser_DeviceStatus.
 * @param state [OPTIONAL] if the state already exists give it to us!
 * @param user [OPTIONAL] if the state already exists give it to us!
 * @return html for img
 */
pbx.users.stateImage = function(obj) {
	var state;
	if (obj.state) {
		state = obj.state;
	} else if (obj.user) {
		state = this.state(user);
	} else {
		top.log.error('pbx.users.stateImage: neither state nor user were present in params.');
		return '<img src="images/status_gray.png" border="0" />';
	}

	switch(state) {
		case 'F': /* Available */
			return '<img src="images/status_green.png" border="0" />';
		case 'B': /* Busy */
			return '<img src="images/status_red.png" border="0" />';
		case 'R': /* Ringing */
			return '<img src="images/status_orange.png" border="0" />';
		case 'U': /* Unavailable */
		default:
			return '<img src="images/status_gray.png" border="0" />';
	}
};
/*---------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------*/
/**
 * VoiceMail Groups object.
 */
pbx.vm_groups = {};

/**
 * Add a VM Group.
 * @param exten VM Group extension.
 * @param group VM Group.
 * @return boolean of success.
 */
pbx.vm_groups.add = function(exten, group) {
	var lines = [];
	lines[0] = exten + ',1,NoOp(' + group.label + ')';
	lines[1] = exten + ',2,VoiceMail(' + group.mailboxes.join('@default&') + '@default' + ')';

	var actions = new listOfSynActions('extensions.conf');
	for (var i=0; i<lines.length; i++) {
		actions.new_action('append', ASTGUI.contexts.VoiceMailGroups, 'exten', line[i]);
	}

	var resp = actions.callActions();
	if (!resp.contains('Response: Success')) {
		top.log.error('pbx.vm_groups.add: Error updating extensions.conf');
		return false;
	}

	sessionData.pbxinfo['vmgroups'][exten] = group;
};

/**
 * Parse VM Group Context.
 * @param cxt VM Group Context.
 * @return boolean of success.
 */
pbx.vm_groups.parse = function(cxt) {
	if (!cxt) {
		top.log.warn('pbx.vm_groups.parse: cxt is empty.');
		return false;
	}

	cxt.each(function(line) {
		var exten = ASTGUI.parseContextLine.getExten(line);
		if (!sessionData.pbxinfo.vmgroups.hasOwnProperty(exten)) {
			sessionData.pbxinfo.vmgroups[exten] = new ASTGUI.customObject;
			sessionData.pbxinfo.vmgroups[exten].label = '';
			sessionData.pbxinfo.vmgroups[exten].mailboxes = [];
		}

		if (line.toLowerCase().contains('noop(')) {
			var name = line.getNoOp();
			sessionData.pbxinfo.vmgroups[exten].label = name;
		} else if (line.toLowerCase().contains('voicemail(')) {
			var members = ASTGUI.parseContextLine.getArgs(line)[0];
			members.split('&').each(function(member) {
				member = member.trim();
				if (member) {
					sessionData.pbxinfo.vmgroups[exten].mailboxes.push(member.beforeChar('@').trim());
				}
			});
		}
	});

	return true;
};

/**
 * Remove VM Group.
 * @param exten VM Group Exten to delete.
 * @return boolean of success.
 */
pbx.vm_groups.remove = function(exten) {
	ASTGUI.miscFunctions.delete_LinesLike({
		context_name: ASTGUI.contexts.VoiceMailGroups,
		beginsWithArr: ['exten=' + exten + ',', 'exten=' + exten + ' ,'],
		filename: 'extensions.conf',
		cb: function(){}
	});

	delete sessionData.pbxinfo.vmgroups[exten];
};
/*---------------------------------------------------------------------------*/

/**
 * Voicemail object.
 */
pbx.voicemail = {};

/*---------------------------------------------------------------------------*/
/**
 * Voice Menus object.
 */
pbx.voice_menus = {};

/**
 * Parse Voice Menus.
 * This takes an array as input and parses the array returning a VoiceMenu structured object.
 * @param cxt The Context Array.
 * @return a voicemenu object.
 */
pbx.voice_menus.parse = function(cxt) {
	var vm = {
		comment: '',
		alias_exten: '',
		includes: [],
		steps: [],
		keypress_events: { 0:'', 1:'', 2:'', 3:'', 4:'', 5:'', 6:'', 7:'', 8:'', 9:'', '#':'', '*':'', t:'', i:''}
	};

	try {
		var steps = ASTGUI.sortContextByExten(cxt, true);
		steps['s'].forEach( function(s) {
			return ASTGUI.parseContextLine.getAppWithArgs(s);
		});

		vm.steps = steps['s'];
		vm.comment = vm.steps[0].getNoOp();
		['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '#', '*', 't', 'i'].each( function(key) {
			if (steps.hasOwnProperty(key) && steps[key].length == 1) {
				vm.keypress_events[key] = ASTGUI.parseContextLine.getAppWithArgs(steps[key][0]);
			}
		});

		cxt.each( function(line, index) {
			if (line.beginsWith('include=')) {
				vm.includes.push(line.afterChar('='));
				return true;
			}
		});
	} catch(err) {
		top.log.error('Error Parsing VoiceMenu. Error info follows.');
		top.log.error(err);
	} finally {
		return ASTGUI.toCustomObject(vm);
	}
};

/**
 * Add a Voice Menu.
 * @param name The Voice Menu's name.
 * @param menu The Voice Menu's info.
 * @param callback Callback function.
 */
pbx.voice_menus.add = function(name, menu, callback) {
	var actions = new listOfActions();
	actions.filename('extensions.conf');
	actions.new_action('delcat', name, '', '');
	actions.new_action('newcat', name, '', '');

	new_menu.includes.each( function(item) {
		actions.new_action('append', name, 'include', item);
	});

	if (menu.alias_exten) {
		if (!menu.alias_exten.contains(',') || !menu.alias_exten.toLowerCase().contains('goto(')) {
			menu.alias_exten = menu.alias_exten.lChop('exten=') + ',1,Goto(' + name + ',s,1)';
		}

		actions.new_action('append', ASTGUI.contexts.VoiceMenuExtensions, 'exten', menu.alias_exten);
	}

	menu.steps.each( function(step) {
		if (!step.beginsWith('s,')) {
			step = 's,' + (i+1) + ',' + step;
		}

		actions.new_action('append', name, 'exten', step);
	});

	for (var evt in menu.keypress_events) {
		if (!menu.keypress_events.hasOwnProperty(evt) || menu.keypress_events[evt] === '') {
			continue;
		}

		var kext = evt + ',1,' + menu.keypress_events[evt];
		actions.new_action('append', name, 'exten', kext);
	}

	var cb = function() {
		sessionData.pbxinfo.voicemenus[name] = ASTGUI.toCustomObject(menu);
		callback();
	};
	actions.callActions(cb);
};

/**
 * Delete a Voice Menu.
 * @param name Voice Menu name.
 * @return boolean of success.
 */
pbx.voice_menus.remove = function(name) {
	var acts = new listOfSynActions('extensions.conf');
	acts.new_action('delcat', name, '', '');

	if (sessionData.pbxinfo.voicemenus[name]['alias_exten'] != '') {
		var aext = sessionData.pbxinfo.voicemenus[name]['alias_exten'].lChop('exten=');
		acts.new_action('delete', ASTGUI.contexts.VoiceMenuExtensions, 'exten', '', aext);
		acts.new_action('delete', 'default', 'exten', '', aext); /* backward compatibility with gui 1.x */
	}

	acts.callActions();

	if (sessionData.pbxinfo.voicemenus.hasOwnProperty(name)) {
		delete sessionData.pbxinfo.voicemenus[name];
	}
	return true;
};

/**
 * Get next available vm
 * @return array with next voicemenu
 */
pbx.voice_menus.next = function() {
	var vm = [];
	var props = sessionData.pbxinfo.voicemenus.getOwnProperties();

	props.each(function(item) {
		if (item.beginsWith(ASTGUI.contexts.VoiceMenuPrefix)) {
			vm.push(item.split(ASTGUI.contexts.VoiceMenuPrefix)[1]);
		}
	});

	if (!vm.length) {
		return ASTGUI.contexts.VoiceMenuPrefix + '1';
	}

	return ASTGUI.contexts.VoiceMenuPrefix + vm.firstAvailable();
};
/*---------------------------------------------------------------------------*/
