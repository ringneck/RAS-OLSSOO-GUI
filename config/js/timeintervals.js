/*
 * Asterisk-GUI	- an Asterisk configuration interface
 *
 * timeintervals.html functions
 *
 * Copyright (C) 2006-2008, Digium, Inc.
 *
 * Pari Nannapaneni <pari@digium.com>
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
var isNewTI ;
var EDIT_TI ;
var TI_LIST = {};
var RMP_TBR_timeIntervals = ['12:00 AM', '12:15 AM', '12:30 AM', '12:45 AM', '01:00 AM', '01:15 AM', '01:30 AM', '01:45 AM', '02:00 AM', '02:15 AM', '02:30 AM', '02:45 AM', '03:00 AM', '03:15 AM', '03:30 AM', '03:45 AM', '04:00 AM', '04:15 AM', '04:30 AM', '04:45 AM', '05:00 AM', '05:15 AM', '05:30 AM', '05:45 AM', '06:00 AM', '06:15 AM', '06:30 AM', '06:45 AM', '07:00 AM', '07:15 AM', '07:30 AM', '07:45 AM', '08:00 AM', '08:15 AM', '08:30 AM', '08:45 AM', '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM', '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM', '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM', '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM', '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM', '03:00 PM', '03:15 PM', '03:30 PM', '03:45 PM', '04:00 PM', '04:15 PM', '04:30 PM', '04:45 PM', '05:00 PM', '05:15 PM', '05:30 PM', '05:45 PM', '06:00 PM', '06:15 PM', '06:30 PM', '06:45 PM', '07:00 PM', '07:15 PM', '07:30 PM', '07:45 PM', '08:00 PM', '08:15 PM', '08:30 PM', '08:45 PM', '09:00 PM', '09:15 PM', '09:30 PM', '09:45 PM', '10:00 PM', '10:15 PM', '10:30 PM', '10:45 PM', '11:00 PM', '11:15 PM', '11:30 PM', '11:45 PM'] ;

// ASTGUI.contexts.TimeIntervalPrefix
var ti_miscFunctions = {
	check_ifDatesAreValid : function( dt ){  // ti_miscFunctions.check_ifDatesAreValid()
		// return true if dt is a valid date string like '05' or '12-25' or '02-18' etc, otherwise return false
		dt = String(dt) ;
		var valid_values = [];
		for(var r=1; r<32; r++) valid_values.push(r);
		var isValidVal = function(a){
			if ( isNaN(a) ) return false;
			if ( valid_values.contains(Number(a)) ) return true;
			return false;
		}

		if( dt.contains('-') ){
			return isValidVal(dt.split('-')[0]) && isValidVal(dt.split('-')[1]);
		}else{
			return isValidVal(dt);
		}
	},

	update_TI : function(){ // ti_miscFunctions.update_TI();
		var tmp_thisTIName = ASTGUI.getFieldValue('edit_ti_name');
		if( isNewTI ){
			for ( var i in TI_LIST){ if( TI_LIST.hasOwnProperty(i) ){
				if ( i.toLowerCase() == tmp_thisTIName.toLowerCase() ){
					ASTGUI.highlightField('edit_ti_name', "A Time Interval already exists by this name !");
					return;
				}
			}}
		}else{
			for ( var i in TI_LIST ){ if( TI_LIST.hasOwnProperty(i) ){
				if ( EDIT_TI.toLowerCase() != tmp_thisTIName.toLowerCase() && i.toLowerCase() == tmp_thisTIName.toLowerCase() ){
					ASTGUI.highlightField ( 'edit_ti_name', "A Time Interval already exists by this name !" ) ;
					return;
				}
			}}
		}


		var ti_name = ASTGUI.contexts.TimeIntervalPrefix + tmp_thisTIName ;
		var ti_time_str = ''; // tmp_timerange + tmp_daysofweek + tmp_daysofmonth + tmp_months
			if( _$('edit_ti_entireday').checked ){
				var tmp_timerange = '*' ;
			}else{
				var tmp_timerange = ASTGUI.miscFunctions.AMPM_to_asteriskTime( _$('edit_ti_starttime').value ) + '-' + ASTGUI.miscFunctions.AMPM_to_asteriskTime( _$('edit_ti_endtime').value ) ;
			}

			if( _$('ti_type_byDayofWeek').checked ){
				var tmp_daysofweek = _$('edit_ti_dayofweek_start').value + '-' +  _$('edit_ti_dayofweek_end').value  ;
				var tmp_daysofmonth = '*' ;
				var tmp_months = '*';
			}else{
				var tmp_daysofweek = '*' ;
			}

			if( _$('ti_type_byGroupofDates').checked ){
				var tmp_daysofmonth = _$('edit_ti_from_date').value ;

				if ( ! ti_miscFunctions.check_ifDatesAreValid(tmp_daysofmonth) ) {
					ASTGUI.highlightField('edit_ti_from_date', "Invalid Date range !");
					return;
				}

				var tmp_months = _$('edit_ti_month').value ;
			}

		ti_time_str = tmp_timerange + '|' + tmp_daysofweek + '|' + tmp_daysofmonth + '|' + tmp_months ;

		var u = new listOfActions('extensions.conf') ;
		if( isNewTI == false ){
			var OLD_TI = ASTGUI.contexts.TimeIntervalPrefix + EDIT_TI; // timeinterval_'edit_ti'
			u.new_action( 'delete' , 'globals' , OLD_TI , '','' ) ;
			////////////////////////////////////
			var EXT_CNF = config2json({filename:'extensions.conf', usf:0 }) ; 
			for( var ct in EXT_CNF){ if( EXT_CNF.hasOwnProperty(ct) ){
				// update any lines in any [DID_Trunkx] that are like "include = DID_trunkx_timeinterval_'a'| ..."
				if( ct.beginsWith(ASTGUI.contexts.TrunkDIDPrefix) && !ct.contains( '_' + ASTGUI.contexts.TimeIntervalPrefix ) ){
					var this_trunk_mainDID = EXT_CNF[ct] ;
					this_trunk_mainDID.each(function(this_line){
						if( this_line.beginsWith('include=') && this_line.contains(ASTGUI.contexts.TrunkDIDPrefix) && this_line.contains( OLD_TI + '|${' ) ){
							u.new_action( 'update' , ct , 'include' , this_line.afterChar('=').replaceXY(OLD_TI,ti_name) , this_line.afterChar('=') ) ;
						}
					});
				}
				// rename any contexts that are like [DID_trunkx_timeinterval_a]
				if( ct.beginsWith(ASTGUI.contexts.TrunkDIDPrefix) && ct.endsWith( OLD_TI ) ){
					u.new_action( 'renamecat', ct , "", ct.replace(OLD_TI, ti_name)) ;
				}
			}}
		}

		u.new_action( 'update' , 'globals' , ti_name , ti_time_str );
		u.callActions( function(){
			if( isNewTI == false ){
				ASTGUI.feedback( { msg:"Updated time interval !", showfor: 3, color:'green', bgcolor:'#FFFFFF' } );
			}else{
				ASTGUI.feedback( { msg:"created time interval '" + tmp_thisTIName + "' !", showfor: 3, color:'green', bgcolor:'#FFFFFF' } );
			}
			window.location.reload();
		});
	},

	delete_TI : function(a){ // ti_miscFunctions.delete_TI
		if( !confirm("Delete Time Interval '" + a + "' ?") ) { return true; }
		var t = ASTGUI.contexts.TimeIntervalPrefix + a ;

		var u = new listOfActions('extensions.conf');
		// delete the time interval definition
		u.new_action('delete' , 'globals' , t , '' , '') ;
		var EXT_CNF = config2json({filename:'extensions.conf', usf:0 }) ; 
		for( var ct in EXT_CNF){ if( EXT_CNF.hasOwnProperty(ct) ){
			// delete any lines in any [DID_Trunkx] that are like "include = DID_trunkx_timeinterval_'a'| ..."
			if( ct.beginsWith(ASTGUI.contexts.TrunkDIDPrefix) && !ct.contains(ASTGUI.contexts.TimeIntervalPrefix) ){
				var this_trunk_mainDID = EXT_CNF[ct] ;
				this_trunk_mainDID.each(function(this_line){
					if( this_line.beginsWith('include=') && this_line.contains(ASTGUI.contexts.TrunkDIDPrefix) && this_line.contains( ASTGUI.contexts.TimeIntervalPrefix + a+'|${' ) ){
						u.new_action( 'delete' , ct , 'include' , '' , this_line.afterChar('=') ) ;
					}
				});
			}
			// delete any contexts that are like [DID_trunkx_timeinterval_a]
			if( ct.beginsWith(ASTGUI.contexts.TrunkDIDPrefix) && ct.endsWith(ASTGUI.contexts.TimeIntervalPrefix + a ) ){
				u.new_action('delcat', ct, "", "");
			}
		}}

		u.callActions(function(){
			ASTGUI.feedback( { msg:"Time Interval '"+ a + "' deleted !", showfor: 3, color:'red', bgcolor:'#FFFFFF' } );
			window.location.reload();
		});
	},

/*
		sessionData.pbxinfo['timebasedRules'][timebasedrule-custom-2] = {
			label : 'LabelForThisRule',
			matches : [ '00:00-23:59|*|25|dec', '00:00-23:59|*|1|jan', '00:00-23:59|*|4|jul' ], // by a set of Dates
				OR
			matches : [ '00:00-23:59|sun-sat|*|*'], // - by Day of Week, matches.length == 1
			ifMatched : 'voicemenu-custom-1,s,1',
			ifNotMatched : 'default,6000,1'
		}
*/

	edit_TI_form : function(a){ // ti_miscFunctions.show_TI_form
		isNewTI = false;
		EDIT_TI = a ;
		ASTGUI.feedback( { msg: 'Edit Time Interval !', showfor: 2 , color: 'green', bgcolor: '#FFFFFF' } );
		_$('div_ti_edit_title').innerHTML = "Edit Time Interval '" + a + "'" ;
		var ti = TI_LIST[a] ;
		ASTGUI.updateFieldToValue( 'edit_ti_name', a ); // name of time interval
		ASTGUI.resetTheseFields( ['edit_ti_starttime', 'edit_ti_endtime', 'edit_ti_dayofweek_start', 'edit_ti_dayofweek_end', 'edit_ti_from_date', 'edit_ti_month' ] );

		var PIECES = TI_LIST[a].split('|') ;
		if( PIECES[0] != '*' ){
			_$('edit_ti_entireday').checked = false ;
			ASTGUI.updateFieldToValue( 'edit_ti_starttime', ASTGUI.miscFunctions.asteriskTime_to_AMPM(PIECES[0].split('-')[0] ) );
			ASTGUI.updateFieldToValue( 'edit_ti_endtime', ASTGUI.miscFunctions.asteriskTime_to_AMPM( PIECES[0].split('-')[1]) );
		}else{
			_$('edit_ti_entireday').checked = true ;
		}

		if( PIECES[2] == '*' && PIECES[3] == '*' ){ // by week days
			_$('ti_type_byDayofWeek').checked = true;
			_$('ti_type_byGroupofDates').checked = false;
			ASTGUI.updateFieldToValue( 'edit_ti_dayofweek_start', PIECES[1].split('-')[0] );
			if( PIECES[1].contains('-') ){ // range of week days
				ASTGUI.updateFieldToValue( 'edit_ti_dayofweek_end', PIECES[1].split('-')[1] );
			}
		}else{ // by days of month
			_$('ti_type_byDayofWeek').checked = false;
			_$('ti_type_byGroupofDates').checked = true;
			ASTGUI.updateFieldToValue( 'edit_ti_from_date',  PIECES[2] );
			ASTGUI.updateFieldToValue( 'edit_ti_month',  PIECES[3] );
		}
		_$('ti_type_byDayofWeek').updateStatus();  _$('ti_type_byGroupofDates').updateStatus();  _$('edit_ti_entireday').updateStatus();
		$('#div_ti_edit').showWithBg();
	},

	new_TI_form : function(){ // ti_miscFunctions.new_TI_form
		isNewTI = true;
		EDIT_TI = '' ;
		_$('div_ti_edit_title').innerHTML = 'New Time Interval';
		ASTGUI.feedback( { msg: 'Create New Time Interval !', showfor: 2 , color: 'green', bgcolor: '#FFFFFF' } );
		ASTGUI.resetTheseFields( ['edit_ti_name','edit_ti_dayofweek_start', 'edit_ti_dayofweek_end', 'edit_ti_from_date', 'edit_ti_month' , 'edit_ti_entireday' , 'edit_ti_starttime' , 'edit_ti_endtime' ] );
		/*
			Time Interval Name: id='edit_ti_name'
			radio : id="ti_type_byDayofWeek"
			select id='edit_ti_dayofweek_start'
			select id='edit_ti_dayofweek_end'
			radio: id="ti_type_byGroupofDates"
			From Date : id="edit_ti_from_date"
			To Date : id="edit_ti_to_date"
			Time:
			checkbox id='edit_ti_entireday'
			Start Time : id="edit_ti_starttime"
			End Time : id="edit_ti_endtime"
		*/
		$('#div_ti_edit').showWithBg();
	},

	showTable : function(){ // ti_miscFunctions.showTable
		ASTGUI.domActions.clear_table(_$('table_tilist'));
		var newRow = _$('table_tilist').insertRow(-1);
		newRow.className = 'frow';
		ASTGUI.domActions.tr_addCell( newRow , { html: 'Time Interval Name' } );
		ASTGUI.domActions.tr_addCell( newRow , { html: 'When' } );
		ASTGUI.domActions.tr_addCell( newRow , { html: '' } );
		for( var i in TI_LIST ){ if( TI_LIST.hasOwnProperty(i) ) {
			var tmp = "<span class='guiButton' onclick=\"ti_miscFunctions.edit_TI_form('" + i +"')\">Edit</span>&nbsp;"
					+ "<span class='guiButtonDelete' onclick=\"ti_miscFunctions.delete_TI('" + i +"')\">Delete</span>" ;
			var newRow = _$('table_tilist').insertRow(-1);
			newRow.className = ((_$('table_tilist').rows.length)%2==1)?'odd':'even';
			ASTGUI.domActions.tr_addCell( newRow , { html: i } );
			ASTGUI.domActions.tr_addCell( newRow , { html: ASTGUI.miscFunctions.GotoIftime_in_humanReadable( TI_LIST[i] ) } );
			ASTGUI.domActions.tr_addCell( newRow , { html: tmp , align: 'center' } );

		}}
	}
};


var localajaxinit = function(){
	top.document.title = 'Manage Time Intervals' ;
	TI_LIST = parent.miscFunctions.getTimeIntervals();
	ti_miscFunctions.showTable();

	ASTGUI.COMBOBOX.call( _$('edit_ti_starttime') , RMP_TBR_timeIntervals , 95 );
	ASTGUI.COMBOBOX.call( _$('edit_ti_endtime') , RMP_TBR_timeIntervals , 95 );

	ASTGUI.domActions.enableDisableByCheckBox ('ti_type_byGroupofDates', ['edit_ti_from_date', 'edit_ti_month']);
	ASTGUI.domActions.enableDisableByCheckBox ('ti_type_byDayofWeek', ['edit_ti_dayofweek_start', 'edit_ti_dayofweek_end']);
	ASTGUI.domActions.enableDisableByCheckBox ('edit_ti_entireday', ['edit_ti_starttime', 'edit_ti_endtime'] , true); // _$('edit_ti_entireday').updateStatus();

	ASTGUI.events.add( 'ti_type_byGroupofDates', 'click' , function(){ _$('ti_type_byDayofWeek').updateStatus(); } ); 
	ASTGUI.events.add( 'ti_type_byDayofWeek', 'click' , function(){ _$('ti_type_byGroupofDates').updateStatus(); } );
};