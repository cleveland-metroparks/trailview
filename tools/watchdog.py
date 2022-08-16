import subprocess
import requests
import time
import os
import shutil
import sys
import json
import uuid

'''
Author: Matthew Oros
Email: mjo1@clevelandmetroparks.com

This script should run as a service which checks trail statuses from the
database and then calls the appropriate scripts to process them
'''

def count_jpgs(dir):
    count = 0
    for path in os.listdir(dir):
        if os.path.isfile(os.path.join(dir, path)):
            if (path.lower().endswith(".jpg")):
                count += 1
    return count

def count_jsons(dir):
    count = 0
    for path in os.listdir(dir):
        if os.path.isfile(os.path.join(dir, path)):
            if (path.lower().endswith('.json')):
                count += 1
    return count


# Status: Upload -> Blur -> Tile -> Sequence -> Done

curr_path = os.path.dirname(os.path.realpath(__file__))

j = open(os.path.join(curr_path, '../', 'config', 'local.json'))
api_key = json.load(j)['api_password']
j.close()

def process(data):
     for t in data['sequenceStatus']:
        if (t['Status'] == 'Sequence'):
            print("Processing Sequence: " + t['Name'])
            flip_str = '--no-flip'
            try:
                sys.stdout.flush()
                with open(os.path.join(curr_path, 'logs', 'watchdog.log'), "a") as outfile:
                    subprocess.run('python ' + os.path.join(curr_path, 'process_sequence_new.py') + ' ' + os.path.join('E:\\trails', t['Name']) + ' ' + flip_str, stdout=outfile)
                sys.stdout.flush()
                with open(os.path.join(curr_path, 'logs', 'watchdog.log'), "a") as outfile:
                    subprocess.run('python ' + os.path.join(curr_path, 'process_data.py E:\\trails'), stdout=outfile)
                sys.stdout.flush()
                with open(os.path.join(curr_path, 'logs', 'watchdog.log'), "a") as outfile:
                    subprocess.run('python ' + os.path.join(curr_path, 'process_imgs_data_db.py E:\\trails'), stdout=outfile)
                sys.stdout.flush()
                requests.post(url = 'https://trailview.cmparks.net/api/status.php', data = json.dumps({'pass': api_key, 'name': t['Name'], 'status': 'Done'}))
            except:
                print("Error occured processing sequence!")
            return
        if (t['Status'] == 'Tile'):
            print("Processing Imgs: " + t['Name'])
            try:
                if os.path.exists(os.path.join('E:\\trails', t['Name'], 'img')):
                    original_count = count_jpgs(os.path.join('E:\\trails', t['Name'], 'img_original'))
                    processed_count = count_jsons(os.path.join('E:\\trails', t['Name'], 'img'))
                    print(original_count)
                    print(processed_count)
                    if (original_count == processed_count):
                        requests.post(url = 'https://trailview.cmparks.net/api/status.php', data = json.dumps({'pass': api_key, 'name': t['Name'], 'status': 'Sequence'}))
                        return
                sys.stdout.flush()
                with open(os.path.join(curr_path, 'logs', 'watchdog.log'), "a") as outfile:
                    subprocess.run('python ' + os.path.join(curr_path, 'process_imgs_new.py ' + os.path.join('E:\\trails', t['Name']) + ' --useblurred True'), stdout=outfile)
                sys.stdout.flush()
            except:
                print("Error occured processing Imgs!")
            return
        if (t['Status'] == 'Blur'):
            print("Processing Blur: " + t['Name'])
            try:
                if not os.path.exists(os.path.join('E:\\trails', t['Name'], 'img_blur')):
                    os.makedirs(os.path.join('E:\\trails', t['Name'], 'img_blur'))
                else:
                    original_count = count_jpgs(os.path.join('E:\\trails', t['Name'], 'img_original'))
                    blur_count = count_jpgs(os.path.join('E:\\trails', t['Name'], 'img_blur'))
                    if (blur_count == original_count):
                        requests.post(url = 'https://trailview.cmparks.net/api/status.php', data = json.dumps({'pass': api_key, 'name': t['Name'], 'status': 'Tile'}))
                        return
                    # shutil.rmtree(os.path.join('E:\\trails', t['Name'], 'img_blur'))
                    # os.makedirs(os.path.join('E:\\trails', t['Name'], 'img_blur'))
                sys.stdout.flush()
                with open(os.path.join(curr_path, 'logs', 'watchdog.log'), "a") as outfile:
                    subprocess.run(os.path.join(curr_path, 'blur360', 'build', 'src', 'equirect-blur-image.exe') + ' ' + 
                        '--blur=true -m=' + os.path.join(curr_path, 'blur360', 'models') + ' -o=' + os.path.join('E:\\trails', t['Name'], 'img_blur') + ' ' + os.path.join('E:\\trails', t['Name'], 'img_original'), stdout=outfile)
                sys.stdout.flush()
            except:
                print("Error occured blurring images!")
            return

def check_delete(data):
    for trail in data:
        if trail['toDelete']:
            try:
                sys.stdout.flush()
                print("Deleting trail: " + trail['name'])
                source_dir = os.path.join('E:\\trails', trail['name'])
                target_dir = os.path.join('E:\\deleted_trails', trail['name'] + '_' + str(uuid.uuid4().hex))
                shutil.copytree(source_dir, target_dir)
                shutil.rmtree(source_dir)

                # Update db
                requests.post(url = 'https://trailview.cmparks.net/api/delete-trail.php', json = {'pass': api_key, 'name': trail['name']})

                print("Done deleting trail: " + trail['name'])
                sys.stdout.flush()
            except:
                print ("Failed to delete trail!")
            return
           

while (True):
    print("Waiting...")
    time.sleep(30)
    r = requests.get(url = 'https://trailview.cmparks.net/api/status.php')

    data = r.json()

    process(data)

    r = requests.get(url = 'https://trailview.cmparks.net/api/mark-delete-trail.php')

    data = r.json()

    check_delete(data['marked'])
    
