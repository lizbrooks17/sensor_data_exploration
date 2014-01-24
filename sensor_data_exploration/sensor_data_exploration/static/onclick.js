/* This function is called automatically when the page is fully loaded */
$( function () {
    //For bottom tabs
    $( '#btn-tabs a' ).click( function (e) {
	e.preventDefault();
	$( this ).tab( 'show' );
    });


    //set up a variable to keep all the charts in, we need to iterate over them to set up the crosshairs.
    //CM - we should see if we can find a way to do this without having the programmer keep track.
    window.chartList = {};

    // set up variables to keep the timestamp range in
    window.starttime = "2014-01-01";
    window.endtime = "2014-01-03";

    // TODO: Make this use today and yesterday
    changeStartTime( 30 );

    //Set up initial graphs: 
    var initial_sensors = ['wu_ti_temp_c', 'wu_ti_pressure_mb', 'wu_ti_wind_kph'];
    initial_sensors.forEach( function( sensorid ) {
	console.log('setting up initial graph for'+ sensorid);
	make_chart_and_manipulate_buttons( sensorid );
	});
    	

    /** Register the callback that handles clicks on the graph buttons */
    $( '.graph-btn' ).click( function(){
	    /* If the click came from one of the "sensor" buttons, make a graph
	       for that sensor */
	var sensorid;
	sensorid = $( this ).attr( 'data-sensorid' );
	$( '.' + sensorid ).button( 'loading' );

	console.log( 'button clicked: ' + sensorid )
	if ($( "#" + sensorid ).length != 0) {
	    // This checks to see if a div called sensorid exists already.
	    // To remove a chart. Remove the div. Change the button classes back. 
	    // I bet this needs to get refactored so that it can also be called when you click the "x" from issue 8.
	    console.log( 'about to remove: ' + sensorid );
	    remove_chart_and_manipulate_buttons( sensorid );
	} else {
	    make_chart_and_manipulate_buttons( sensorid );
	};
	
    });
   
    /**
      Change the date range to be from 'graph_days' ago till now
      Update all the currently displayed graphs
      TODO:
       Update currently displayed start and end times
     */

    $('#save-date').click(function(){
	var newstart = $('#starttimepicker').datepicker('getDate');
	var newend = $('#endtimepicker').datepicker('getDate');
	if (newstart > newend) {
	    var swaptime = newstart;
	    newstart = newend;
	    newend = swaptime;
	}
	console.log('custom date start is ' + newstart + " and end is " + newend);
	update_dates(newstart, newend);
	update_existing_charts();
    });

    $(".time-btn").click(function() {
	change = $(this).attr('graph_days');
	console.log('days to graph: ' + change);
	changeStartTime(change);
    });

    $("#clear").click(function(){
	$('div#charts > div').each(function() {
	    s_id = $(this).attr('data-sensorid');
	    remove_chart_and_manipulate_buttons( s_id );
	});
    });

    $("#unzoom").click(function(){
	// Unzoom all the charts
	console.log('startin unzoom')
	// We don't use startUTC and EndUTC here because we want to force to window settings.
	var endDate = new Date(window.endtime);
	var endUTC = endDate.getTime() + endDate.getTimezoneOffset() * 60000;
	var startDate =new Date(window.starttime);
	var startUTC = startDate.getTime() + startDate.getTimezoneOffset() * 60000;

	$('div#charts > div').each(function() {
	    s_id = $(this).attr('data-sensorid');
	    console.log('going to unzome the following: ' + s_id);
	    var chartIndex = $("#"+s_id+"-chart").data('highchartsChart');
	    console.log('chartindex is' + chartIndex);
	    if (typeof chartIndex === 'number') {    //error messages will have undefined chartIndex
		var thisChart = Highcharts.charts[chartIndex];
//		thisChart.options.chart.isZoomed = false;
		thisChart.xAxis[0].setExtremes(startUTC, endUTC, true);
	    };
	});
    });
});

/** This function updates the existing charts on our page with new time
    selectors, which have already been stored in window.starttime and
    window.endtime */
function update_existing_charts() {
    var endDate = new Date(window.endtime);
    var endUTC = endDate.getTime() + endDate.getTimezoneOffset() * 60000;
    var startDate =new Date(window.starttime);
    var startUTC = startDate.getTime() + startDate.getTimezoneOffset() * 60000;
	
    console.log('about to loop through chartList' + window.chartList);
    $('div#charts > div').each(function() {
	    s_id = $(this).attr('data-sensorid');
	    var chartIndex = $("#"+s_id+"-chart").data('highchartsChart');
	    console.log('chartIndex is' + chartIndex +"for " + s_id);	  
	    var thisChart = Highcharts.charts[chartIndex];
	    if (typeof chartIndex === 'number') {    //error messages will have undefined chartIndex  
		thisChart.showLoading();
		$('.'+s_id).button('loading');


		$.getJSON('/explorer/get_data_ajax/',{'sensorid': s_id, 'starttime': starttime, 'endtime': endtime})
		    .done(function(data) {
			if (data.goodPlotData) {

			    var chartIndex = $("#"+data.sensor_id+"-chart").data('highchartsChart');
			    var thisChart = Highcharts.charts[chartIndex];
			    thisChart.series[0].setData(data.data_array1,false);
			    thisChart.xAxis[0].setExtremes(startUTC, endUTC, true);
			    thisChart.hideLoading();

			    $('.'+data.sensor_id).button('reset');  //Reset the loading on the button
			} else {
			    var errorClass = 'alert alert-warning';
			    $('#'+'data.sensor_id'+'-chart').html('<div class="' + errorClass + '" >'+data.plotError+'</div>');
			    $('.'+data.sensor_id).button('reset');  //Reset the loading on the button
			}
		    })
		    .fail(function(jqxhr, textStatus, error) {
			var err = textStatus + ", " + error;
			console.log( "Request Failed: " + err );
		    });
		//need an else here to try again to draw the graph if it had an error in the original time.
	    };
	});
}

/**
   Change window.endtime to now.
   Change window.starttime to this number of days before now
*/
function changeStartTime(days) {
    var today = new Date();
    // Get to midnight tonight, just on the start of tomorrow
    var tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate()+1);
    var starttime = tomorrow.getTime();
    starttime -= days * 24 * 3600 * 1000;
    var startday = new Date(starttime);
    update_dates(startday, tomorrow);
}

/**
   Print the given Date in the format the database will expect

   TODO: Add time zone and make sure it is GMT
 */
function printDate( d ) {
    var rtn = "";
    var t;
    rtn += d.getFullYear();
    t = d.getMonth() + 1;
    rtn += ((t < 10) ? "-0" : "-") + t;
    t = d.getDate();
    rtn += ((t < 10) ? "-0" : "-") + t + " ";
    t = d.getHours();
    rtn += ((t < 10) ? "0" : "") + t + ":";
    t = d.getMinutes();
    rtn += ((t < 10) ? "0" : "") + t;
    return rtn;
}

/**
   Print a date in a format people like
*/
function prettyDate( d ) {
    var rtn = "";
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    rtn += d.getDate() + "-";
    rtn += months[d.getMonth()] + "-";
    rtn += d.getFullYear();
    return rtn;
}

/**
   Make the sensorid button display a loading message till the chart is
   displayed
 */
function make_chart_and_manipulate_buttons( sensorid ) {
    $( '.'+sensorid ).button( 'loading' );
    $( '.'+sensorid ).addClass( 'btn-primary' );
    $( '.'+sensorid ).removeClass( 'btn-default' );
    $.when( ajax_make_chart( sensorid, window.starttime, window.endtime ))
	.done( function() {
		$( '.'+sensorid ).button( 'reset' );
	    });
}

/**
   Delete charts and play with the buttons to keep users from clicking
   too often and to make sure they get colored right
 */
function remove_chart_and_manipulate_buttons( sensorid ) {
    $( "#" + sensorid ).remove();
    $( '.' + sensorid ).addClass( 'btn-default');
    $( '.' + sensorid ).removeClass( 'btn-primary');
    //Arbitrarily make the loading show up for half a second to discourage double clicking.
    setTimeout( function () {
	    $( '.'+sensorid ).button( 'reset' );
	}, 500);
}


// function startUTC() {
//     //This returns the start extreme for the xAxis in UTC.
//     //Need to add zoom here eventually
//     var startDate =new Date(window.starttime);
//     var startUTC = startDate.getTime() + startDate.getTimezoneOffset() * 60000;
//     return startUTC;
// }

// function endUTC() {
//     //This returns the end extreme for the xAxis in UTC.
//     //Need to add zoom here eventually
//     var endDate = new Date(window.endtime);
//     var endUTC = endDate.getTime() + endDate.getTimezoneOffset() * 60000;
//     return endUTC;
// 

/** Takes two UTC dates.
    Updates the labels on the graph screen and the default dates on the
    datepicker
    Updates the globals, window.starttime and window.endtime, used by the
    graphs.
*/
function update_dates(startday, endday) {
    window.starttime = printDate( startday );
    window.endtime = printDate( endday );
    window.prettyStart = prettyDate( startday );
    window.prettyEnd = prettyDate( endday );
    $("#startdate").html( window.prettyStart );
    $("#enddate").html( window.prettyEnd );
    $("#startText").val( window.prettyStart );
    $("#endText").val( window.prettyEnd );
    /* The Documentation for eternicode's date picker is pretty clear
     * on the idea that one of these lines should cause the date we
     * see on the custom date selector to match the date here.  It
     * does not work.  This may be because we had to hack things to
     * make them work for Bootstrap 3 and datepicker was written for
     * bootstrap 2 */
    
    $("#endtimepicker").datepicker( 'setDate', endday );
    $("#starttimepicker").datepicker( 'setDate', startday );
}