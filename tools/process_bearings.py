import configparser     # for processing ini file
import os               # for manipulating filesystem
import datetime         # for processing exif capture time
from geographiclib.geodesic import Geodesic # for processing geo distance and bearing
import json             # for processing json files
import uuid             # for generating UUID's
import argparse         # for processing console arguments
from cmath import rect, phase       # for angle calculations
from math import radians, degrees   # for angle calculations

'''
Author: Matthew Oros
Date: 6/15/22
Email: mjo1@clevelandmetroparks.com
'''

# Returns mean of list of angles in degrees
def mean_angle(deg: list[float]) -> float:
    return degrees(phase(sum(rect(1, radians(d)) for d in deg)/len(deg))) % 360

# Create dictionary from img json files
def get_all_images(dir: str) -> list:
    # Format of images list
    # [{'name', 'date', 'latitude', 'longitude'}, ...]
    images = []
    # Iterate through directory
    for filename in os.listdir(dir):
        filepath = os.path.join(dir, filename)
        # Must be json file
        if not filepath.endswith('.json'):
            continue
        # Read json
        f = open(filepath)
        img_data = json.load(f)
        f.close()
        # Add data to images list
        image = {}
        image['name'] = filename.replace('.json', '')
        image['date'] = datetime.datetime.strptime(str(img_data['creationDate']), '%Y-%m-%d %H:%M:%S')
        image['latitude'] = img_data['latitude']
        image['longitude'] = img_data['longitude']
        if image['latitude'] != 0.0 and image['longitude'] != 0.0 and image['date'] != None:
            images.append(image)
    return images

# Process console arguments
parser = argparse.ArgumentParser(description="Create sequence.json")
parser.add_argument('dir', type=str, help='Directory that contains the img folder.')
parser.add_argument('--flip', action=argparse.BooleanOptionalAction, help='The sequence will be flipped 180*')
args = parser.parse_args()

directory = str(args.dir)
# Verify directory
if not os.path.exists(os.path.join(directory, 'img')):
    print('img Directory does not exist!')

# Read config
config_local = configparser.ConfigParser()
config_global = configparser.ConfigParser()

if os.path.exists(os.path.join(directory, 'process_sequence.ini')):
    config_local.read(os.path.join(directory, 'process_sequence.ini'))
config_global.read('process_sequence.ini')

def str2bool(str):
    str = str.lower()
    if str in ['yes', '1', 'true', 'on']:
        return True
    else:
        return False

def get_config(option):
    if os.path.exists(os.path.join(directory, 'process_sequence.ini')):
        if config_local.has_option('ProcessSequenceConfig', option):
            return config_local.get('ProcessSequenceConfig', option)
        else:
            return config_global.get('ProcessSequenceConfig', option)
    else:
        return config_global.get('ProcessSequenceConfig', option)

flipped = args.flip

# Get images info
print("Getting image info")
images = get_all_images(os.path.join(directory, 'img'))

# Sort images by datetime taken
print("Sorting images")
images.sort(key=lambda x: x['date'])

# Set bearing of images
print("Setting bearing of images")
for i in range(len(images)):
    # If last image, set bearing to previous image
    if i == (len(images) - 1):
        images[i]['bearing'] = images[i - 1]['bearing']
        continue
    img1 = images[i]
    img2 = images[i + 1]
    info = Geodesic.WGS84.Inverse(img1['latitude'], img1['longitude'], img2['latitude'], img2['longitude'])
    # If distance is less than cutoff, then base bearing on next and previous image
    if (info['s12'] <= 10):
        # Get bearing based on next image
        brng = info['azi1']
        if brng < 0:
            brng += 360
        if flipped:
            brng = (brng + 180) % 360

        # If not the first image
        if i != 0:
            # Determine if and then use bearing based on previous image as well
            avg = mean_angle([brng, images[i - 1]['bearing']])
            diff = ((brng - avg) + 180) % 360 - 180
            if diff < float(get_config('PrevImageBearingInfluenceCutoffAngle')):
                images[i]['bearing'] = avg
            else:
                # Only base bearing on next image
                images[i]['bearing'] = brng 
        else:
            # Only base bearing on next image
            images[i]['bearing'] = brng
    else:
        # If distance not less than cutoff, then bearing is based on previous image
        images[i]['bearing'] = images[i - 1]['bearing']

# Remove images without necessary metadata
print("Removing images without necessary metadata")
filtered_images = []
for img in images:
    if 'bearing' in img and 'latitude' in img and 'longitude' in img and 'date' in img:
        filtered_images.append(img)
images = filtered_images


# Create viewer config json
print("Writing json file                              ")
bearing_json = {
    'bearing_sequence': {

    }
}

for i in range(len(images)):
    img = images[i]
    yaw = 180
    if flipped:
        yaw = 0
    bearing_json['bearing_sequence'][img['name']] = img['bearing']

# Export sequence json
with open(os.path.join(directory, "bearing_sequence.json"), "w") as outfile:
    json.dump(bearing_json, outfile)

print("Done!")
