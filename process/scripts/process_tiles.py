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
import shutil           # For deleting folder
import sys

'''
Author: Matthew Oros
Email: mjo1@clevelandmetroparks.com

This script creates image tiles
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
        lat_str = str(int(lat[0])) + "°" + str(int(lat[1])) + \
            "'" + str(lat[2]) + '"' + str(gps_info['GPSLatitudeRef'])
        lon_str = str(int(lon[0])) + "°" + str(int(lon[1])) + "'" + \
            str(lon[2]) + '"' + str(gps_info['GPSLongitudeRef'])
        geo = (dms2dec(lat_str), dms2dec(lon_str))

    return geo


parser = argparse.ArgumentParser(description="Process image tiles.")
parser.add_argument(
    'dir', type=str, help='Directory that contains the img_original folder.')
parser.add_argument('--replace', nargs='?', type=bool,
                    help='If set to true, then will replace existing img folder; default: False', default=False)
parser.add_argument('--useblurred', nargs='?', type=bool,
                    help='When enabled, it uses images from the img_blur folder and metadata from img_original')
args = parser.parse_args()

directory = args.dir
original_path = os.path.join(directory, 'img_original')
blur_path = os.path.join(directory, 'img_blur')

use_blurred = args.useblurred

if use_blurred:
    print("Using blurred!")

# Verify directories
if not os.path.exists(os.path.join(directory, 'img')):
    os.makedirs(os.path.join(directory, 'img'))
elif (args.replace == True):
    shutil.rmtree(os.path.join(directory, 'img'))
    os.makedirs(os.path.join(directory, 'img'))


done_imgs = []
img_path = os.path.join(directory, 'img')
for filename in os.listdir(img_path):
    file_path = os.path.join(img_path, filename)
    if os.path.isfile(file_path):
        if file_path.lower().endswith(".json"):
            f = open(file_path)
            j = json.load(f)
            f.close()
            done_imgs.append(j['originalName'])

# Iterate through original images
count = 1
file_count = 0
file_total = len(os.listdir(original_path))
for filename in os.listdir(original_path):
    file_path = os.path.join(original_path, filename)
    if os.path.isfile(file_path):
        if not file_path.lower().endswith(".png"):
            continue
        file_count += 1
        if (filename in done_imgs):
            continue
        print('\nProcessing (' + str(file_count) + '/' + str(file_total) + ')')
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

        img_file = file_path
        if use_blurred:
            img_file = os.path.join(blur_path, filename)

        # Generate image tiles
        sys.stdout.flush()
        subprocess.run("python " + os.path.join(os.path.dirname(os.path.realpath(__file__)), 'generate.py') +
                       " --haov 360.0 --fallbacksize 0 --vaov 180.0 \"" + str(img_file) + "\" -q 85 -o \"" + directory + "/img/" + image_id + "\"", shell=True)
        sys.stdout.flush()
        count += 1
        if count > 50:
            exit()

print("Done!")
