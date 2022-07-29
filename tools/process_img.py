import subprocess       # For calling tile generation script
import os               # For directory manipulation
import argparse         # For processing console arguments
import uuid             # For generating UUID's
import PIL.Image        # For processing images
import datetime         # For processing exif creation date
from PIL.Image import Image         # For processing images
from PIL.ExifTags import TAGS       # For processing exif
from PIL.ExifTags import GPSTAGS    # For processing exif
from dms2dec.dms_convert import dms2dec     # For converting coordinates
import json             # For processing json files

'''
Author: Matthew Oros
Date: 6/15/22
Email: mjo1@clevelandmetroparks.com
'''

# Get creation date from picture
def get_exif_date(img: Image) -> datetime.datetime:
    exif = img.getexif()
    creation_date_str: str = str(exif.get(306))
    return datetime.datetime.strptime(creation_date_str, "%Y:%m:%d %H:%M:%S")

# Get latitude and longitude from picture
def get_exif_geo(img: Image) -> tuple[float, float]:
    exif_table = {}
    info = img._getexif()
    for tag, value in info.items():
        decoded = TAGS.get(tag, tag)
        exif_table[decoded] = value

    gps_info = {}
    if 'GPSInfo' in exif_table:
        for key in exif_table['GPSInfo'].keys():
            decode = GPSTAGS.get(key, key)
            gps_info[decode] = exif_table['GPSInfo'][key]

    geo = (0.0, 0.0)

    if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
        lat = gps_info['GPSLatitude']
        lon = gps_info['GPSLongitude']
        lat_str = str(int(lat[0])) + "°" + str(int(lat[1])) + "'" + str(lat[2]) + '"' + str(gps_info['GPSLatitudeRef'])
        lon_str = str(int(lon[0])) + "°" + str(int(lon[1])) + "'" + str(lon[2]) + '"' + str(gps_info['GPSLongitudeRef'])
        geo = (dms2dec(lat_str), dms2dec(lon_str))

    return geo

parser = argparse.ArgumentParser(description="Process a single image's tiles.")
parser.add_argument('dir', type=str, help='Directory of trail')
parser.add_argument('img', type=str, help='Image Name')
args = parser.parse_args()

directory = args.dir
filename = args.img
file_path = os.path.join(directory, 'img_original', filename)

# Verify directories
if not os.path.exists(os.path.join(directory, 'img')):
    os.makedirs(os.path.join(directory, 'img'))


if os.path.isfile(file_path):
    if not file_path.lower().endswith(".jpg"):
        exit()
    print('Filename: ' + str(filename))
    image_id = str(uuid.uuid4().hex)
    print('Generated UUID: ' + image_id)
    img = PIL.Image.open(file_path)
    geo = get_exif_geo(img)
    image_data = {
        'originalName': str(filename),
        'creationDate': str(get_exif_date(img)),
        'latitude': geo[0],
        'longitude': geo[1],
    }
    # Export json
    with open(os.path.join(directory, 'img',  image_id + ".json"), "w") as outfile:
        json.dump(image_data, outfile, indent=4)

    # Generate image tiles
    subprocess.call("python " + os.path.join(os.path.dirname(os.path.realpath(__file__)), 'generate.py') + " --haov 360.0 --vaov 180.0 " + str(file_path) + " -q 70 -o " + directory + "/img/" + image_id, shell=True)

