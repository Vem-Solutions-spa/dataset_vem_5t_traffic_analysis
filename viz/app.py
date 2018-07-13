# -*- coding: utf-8 -*-

import pandas as pd
from shapely.geometry import Point, shape

from flask import Flask
from flask import render_template

from flask import Response
from flask import request

import json
import datetime

import random
import numpy as np

from pymongo import MongoClient


data_path = './input/'
n_samples = 3000

testv = 1

#client = MongoClient('mongodb://localhost:27017/')
#db = client.vem
#coll = db.june2017

alldata = False
wehavedata = False



def get_age_segment(age):
    if age <= 22:
        return '22-'
    elif age <= 26:
        return '23-26'
    elif age <= 28:
        return '27-28'
    elif age <= 32:
        return '29-32'
    elif age <= 38:
        return '33-38'
    else:
        return '39+'

def get_location(longitude, latitude, provinces_json):
    
    point = Point(longitude, latitude)

    #for record in torino_json['features']:
    polygon = shape(torino_json)
    if polygon.contains(point):
        return 1
    return 0


with open(data_path + '/geojson/china_provinces_en.json') as data_file:    
    provinces_json = json.load(data_file)

with open(data_path + '/geojson/torino.json') as data_file:    
    torino_json = json.load(data_file)

app = Flask(__name__)


@app.route("/testvar")
def testvar():
    global testv
    testv = testv+1
    return Response(str(testv))

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/data_old_000")
def get_data_000():
    gen_age_tr = pd.read_csv(data_path + 'gender_age_train.csv')
    ev = pd.read_csv(data_path + 'events.csv')
    ph_br_dev_model = pd.read_csv(data_path + 'phone_brand_device_model.csv')

    df = gen_age_tr.merge(ev, how='left', on='device_id')
    df = df.merge(ph_br_dev_model, how='left', on='device_id')
    #Get n_samples records
    df = df[df['longitude'] != 0].sample(n=n_samples)


    top_10_brands_en = {'华为':'Huawei', '小米':'Xiaomi', '三星':'Samsung', 'vivo':'vivo', 'OPPO':'OPPO',
                        '魅族':'Meizu', '酷派':'Coolpad', '乐视':'LeEco', '联想':'Lenovo', 'HTC':'HTC'}

    df['phone_brand_en'] = df['phone_brand'].apply(lambda phone_brand: top_10_brands_en[phone_brand] 
                                                    if (phone_brand in top_10_brands_en) else 'Other')

    df['age_segment'] = df['age'].apply(lambda age: get_age_segment(age))

    df['latitude'] = df.apply(lambda row: random.uniform(45,45.15), axis=1)
    df['longitude'] = df.apply(lambda row: random.uniform(7.55,7.77), axis=1)

    #df['location'] = df.apply(lambda row: "other", axis=1)
    df['location'] = df.apply(lambda row: get_location(row['longitude'], row['latitude'], provinces_json), axis=1)


    cols_to_keep = ['timestamp', 'longitude', 'latitude', 'phone_brand_en', 'gender', 'age_segment', 'location']
    df_clean = df[cols_to_keep].dropna()

    return Response(df_clean.to_json(orient='records'),mimetype='application/json')

@app.route("/data_old_001")
def byday():
    #global coll
    day = request.args.get('date')
    if(not day):
        day="2017-06-01"
    #result = coll.count({'loc': {'$exists': False}})
    #result = coll.find({"deviceid":"{ "$regex" : "^2018-06-01" }"})

    df =  pd.DataFrame.from_records(coll.find({"recording_date":{ "$regex" : "^"+day }}).limit(10000))
    df = df.drop(columns=["_id"])
    df = df.rename(index=str, columns={"lat": "latitude", "lon": "longitude","recording_date":"timestamp"})

    """
    df['timestamp'] = pd.to_datetime(df['timestamp'], format='%Y-%m-%d %H:%M:%S')
    df['ts2'] = df.apply(lambda row: 
                datetime.datetime.fromtimestamp(
                    row['timestamp'].to_pydatetime().timestamp()//(60*1000)*(60*1000)),
                axis=1)
    df['timestamp'] = df.apply(lambda row: 
                datetime.datetime.fromtimestamp(
                    row['timestamp'].to_pydatetime().timestamp() #//(60)*(60) #- (row['timestamp'].to_pydatetime().timestamp() % (60*15))
                )
                .strftime('%Y-%m-%d %H:%I:%S'), 
                axis=1)
                """

    #df['location'] = df.apply(lambda row: "other", axis=1)
    df['location'] = df.apply(lambda row: get_location(row['longitude'], row['latitude'], provinces_json), axis=1)

    df['gender'] = df.apply(lambda row: "1", axis=1)
    df['age_segment'] = df.apply(lambda row: "1", axis=1)
    df['phone_brand_en'] = df.apply(lambda row: "1", axis=1)

    return Response(df.to_json(orient='records'),mimetype='application/json')




@app.route("/data")
def data_002():
   # global coll
    global alldata
    global wehavedata

    #weekday = request.args.get('weekday')
    #if(not weekday):
    #    weekday="_W"

    #interval = (request.args.get('interval'))
    #if(not interval):
    #    interval=24


    if(wehavedata==False):
        print("------------------ creating data -------------------")
        df = rawData()
        df = df.assign(time=(30*60*(df["interval"]-1)))    
        df = df.assign(hour = interval2hour(df["interval"]) )    
        df['location'] = df.apply(lambda row: get_location(row['lon'], row['lat'], provinces_json), axis=1)

        df['gender'] = df.apply(lambda row: "1", axis=1)
        df['age_segment'] = df.apply(lambda row: "1", axis=1)
        alldata = df     
        wehavedata = True    
    else:
        print("OK data")
        df = alldata

    return Response(df.to_json(orient='records'),mimetype='application/json')

    #df =  pd.DataFrame.from_records(coll.find({"recording_date":{ "$regex" : "^"+day }}).limit(10000))
    #df = df.drop(columns=["_id"])
    #df = df.rename(index=str, columns={"lat": "latitude", "lon": "longitude","recording_date":"timestamp"})

    #df['location'] = df.apply(lambda row: get_location(row['longitude'], row['latitude'], provinces_json), axis=1)


    #return Response(df.to_json(orient='records'),mimetype='application/json')


def mockData1():
    columns = ['weekday','interval','lat','lon','tl_true','tl_predicted','difference']
    weekdays = ["WD","SA","SU"]
    intervals = range(1,49,2)
    lats = np.arange(45.0,45.15,0.005)
    longs = np.arange(7.5,7.80,0.005)

    df = pd.DataFrame(columns=columns)
    for weekday in weekdays:
        for interval in intervals:
            for lat in lats:
                for lon in longs:
                    if random.uniform(0,100)<97:
                        #print("skip")
                        continue
                    if weekday=="WD":
                        seed = 100
                    else:
                        seed = 50
                    #seed = 100
                    tl_true = random.uniform(0,seed)
                    tl_predicted = tl_true + random.uniform(0,seed/3)
                    row = {"weekday":weekday,
                           "interval":interval,
                           "lat":lat,
                           "lon":lon,
                           "tl_true":tl_true,
                           "tl_predicted":tl_predicted,
                           "difference":tl_true-tl_predicted
                           }
                    df = df.append(row,ignore_index=True)
                    print(row)
                    #print(df.shape)

    #print(df.to_string())
    
    return df

def rawData():
    df = pd.read_csv("input/raw_values.csv")
    df = df.rename(columns={"hour_half": "interval", "cell_centroid_lat": "lat", "cell_centroid_lon":"lon","TL":"tl_true","TL_pred":"tl_predicted","diff_TL":"difference"})

    return df

def interval2hour(interval):
    return interval//2

if __name__ == "__main__":
    app.run(host='0.0.0.0',port=5000,debug=True)