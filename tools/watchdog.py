import subprocess
import requests
import time
import os
import shutil
import sys

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

def process(data):
     for t in data['Status']:
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
                requests.post(url = 'https://trailview.cmparks.net/admin/api/set_status.php', data = {'pass': '2Vnhn7XjekbR55uSGhtUr7mJSqRrGcRA', 'name': t['Name'], 'status': 'Done'})
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
                        requests.post(url = 'https://trailview.cmparks.net/admin/api/set_status.php', data = {'pass': '2Vnhn7XjekbR55uSGhtUr7mJSqRrGcRA', 'name': t['Name'], 'status': 'Sequence'})
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
                        requests.post(url = 'https://trailview.cmparks.net/admin/api/set_status.php', data = {'pass': '2Vnhn7XjekbR55uSGhtUr7mJSqRrGcRA', 'name': t['Name'], 'status': 'Tile'})
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

while (True):
    print("Waiting...")
    time.sleep(30)
    r = requests.get(url = 'https://trailview.cmparks.net/admin/api/status.php')

    data = r.json()

    process(data)
    
