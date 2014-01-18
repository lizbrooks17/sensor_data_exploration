import json
from django.shortcuts import render
from django.template import RequestContext
from django.shortcuts import render_to_response
from sensor_data_exploration.apps.explorer.models import *
from django.utils import simplejson
import time
from django.http import HttpResponse
from django.core.serializers.json import DjangoJSONEncoder

# Create your views here.

def index(request):
    ''' The main page for the explorer app '''
    # Request the context of the request.
    # The context contains information such as the client's machine details, for example.
    context = RequestContext(request)

    # Construct a dictionary to pass to the template engine as its context.
    # Note the key boldmessage is the same as {{ boldmessage }} in the template!
    plot_data = get_data('wu_ti_temp_f')
    # We only need to convert the complicated things to JSON.
    # The strings for things like titles are fine the way they are
    context_dict = {}
    context_dict['plotdata'] = simplejson.dumps(plot_data)

    #Get the available sensors to print out buttons for them
    context_dict['sensor_list'] = get_sensors()

    # Return a rendered response to send to the client.
    # We make use of the shortcut function to make our lives easier.
    # Note that the first parameter is the template we wish to use.
    return render_to_response('explorer/index.html', context_dict, context)

def about(request):
    ''' About page, mostly to practice having links '''
    context = RequestContext(request)
    context_dict = {}
    return render_to_response('explorer/about.html', context_dict, context)

# Does this want to move to another file?
# CM: I'm about to repeat a bunch of this code into get_data_ajax rather the break this but we will need to refactor to be DRY.
def get_data(plot_sensor_id):
    '''Read data from the database, preparing to make a plot'''

    # TODO
    # add data/time selectors
    # Improve feedback when the sensor_id is bad
    # Improve feedback when there is no plot data

    plot_data = {}
    plot_data['goodPlotData'] = True

    # Make sure we have a sensor_id that is in the sensor table
    if Sensor.objects.filter(sensor_id=plot_sensor_id) == False:
        plot_data['goodPlotData'] = False
        plot_data['plotError'] = "Error retrieving plot data for sensor " + plot_sensor_id + ". No such sensor."
        return plot_data

    # We know there is at least one sensor that matches our given id.
    # just take the first one.  That'll teach them to repeat values!
    s = Sensor.objects.filter(
        sensor_id=plot_sensor_id
        )
    plot_sensor = s.values()[0]
    print plot_sensor
    # Pick out Sensor fields to display as part of the plot
    plot_data['plot_title'] = plot_sensor['sensor_short_name']
    plot_data['plot_subtitle'] = plot_sensor['data_source_id']
    plot_data['plot_yaxis_label'] = plot_sensor['units_long']
    plot_data['point_label'] = plot_sensor['units_short']
    
    # Retrieve the actual data for the plot
    q = SensorData.objects.filter(
        sensor_id_id=plot_sensor_id
        )
    
    # Pick out the times of the observations, and convert them to JavaScript
    # timestamps, which are in milliseconds
    xdata = []
    xdata_datetime = q.values_list('time_stamp', flat=True)
    for i in range(0, len(xdata_datetime)):
        xdata.append(time.mktime(xdata_datetime[i].timetuple()) * 1000)
    plot_data['xdata'] = list(xdata)

    # Pick out the values for each observation
    ydata = q.values_list('num_value', flat=True)
    plot_data['ydata'] = list(ydata)

    # Make sure that we actually got some data, or this plot is no good
    if len(plot_data['xdata']) == 0 or len(plot_data['ydata']) == 0:
        plot_data['plotError'] = "Error retrieving plot data for plot " + plot_sensor_id + ": No data" # for the time range {startdate} {enddate}
        plot_data['goodPlotData'] = False

    return plot_data


def get_data_ajax(request):
    '''Read data from the database, preparing to make a plot'''

    print "starting get_data_ajax with plot_sensor_id= "
    plot_sensor_id = request.GET.get('sensorid')
    print plot_sensor_id

    # TODO
    # add data/time selectors
    # Improve feedback when the sensor_id is bad
    # Improve feedback when there is no plot data

    # Make sure we have a sensor_id that is in the sensor table
    if Sensor.objects.filter(sensor_id=plot_sensor_id) == False:
        data_to_dump = {'goodPlotData': False,
                        'plotError': "Error retrieving plot data for sensor " + plot_sensor_id + ": No such sensor",
                        }
        print "data_to_dump"
        print data_to_dump
        json_data = json.dumps(data_to_dump, cls=DjangoJSONEncoder)
        print json_data
        return HttpResponse(json_data, mimetype='application/json')

    # We know there is at least one sensor that matches our given id.
    # just take the first one.  That'll teach them to repeat values!
    s = Sensor.objects.filter(
        sensor_id=plot_sensor_id
    )
    plot_sensor = s.values()[0]
    print plot_sensor
    # Pick out Sensor fields to display as part of the plot
    
    # Retrieve the actual data for the plot
    q = SensorData.objects.filter(
        sensor_id_id=plot_sensor_id
        )
    
    # Pick out the times of the observations, and convert them to JavaScript
    # timestamps, which are in milliseconds
    xdata = []
    xdata_datetime = q.values_list('time_stamp', flat=True)
    for i in range(0, len(xdata_datetime)):
        xdata.append(time.mktime(xdata_datetime[i].timetuple()) * 1000)
        xdata = list(xdata)

    # Pick out the values for each observation
    ydata = q.values_list('num_value', flat=True)
    ydata = list(ydata)

    # Make sure that we actually got some data, or this plot is no good
    if len(xdata) == 0 or len(ydata) == 0:
        print "get_data: Error retrieving plot data for plot " + plot_sensor_id + ": No data"
        data_to_dump = {'goodPlotData': False,
                        'plotError': "Error retrieving plot data for plot " + plot_sensor_id + ": No data for time range [starttime, endtime]",
                        }
        print "data_to_dump"
        print data_to_dump
        json_data = json.dumps(data_to_dump, cls=DjangoJSONEncoder)
        print json_data
        return HttpResponse(json_data, mimetype='application/json')

    goodPlotData = True
    data_to_dump = {'xdata': xdata, 
                    'ydata': ydata,
                    'plot_title': plot_sensor['sensor_short_name'],
                    'plot_subtitle': plot_sensor['data_source_id'],
                    'plot_yaxis_label': plot_sensor['units_long'],
                    'point_label': plot_sensor['units_short'],
                    'goodPlotData': goodPlotData
                }
    print "data_to_dump"
    print data_to_dump
    json_data = json.dumps(data_to_dump, cls=DjangoJSONEncoder)
    print json_data
    return HttpResponse(json_data, mimetype='application/json')

def get_sensors():
    '''Make a list of the available sensors'''
    #Eventually put more logic in here about what we actually want to
    #show and maybe make categories of different types of sensors
    sensors = SensorData.objects.values_list('sensor_id', flat=True).distinct()
    sensor = list(sensors)
    return sensors
