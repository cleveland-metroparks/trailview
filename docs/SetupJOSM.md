# Setup JOSM

1. Download `OpenWebStart` from [here](https://openwebstart.com/)

2. Download `JOSM` from [here](https://josm.openstreetmap.de/) and download the `.jnlp` file, not the `.jar`

3. The `.jnlp` file can be opened by `OpenWebStart` 

4. Some plugins need to be downloaded to work with geo-tagged images
   
   1. Go to `Edit` on the top and then click `Preferences`
   
   2. Navigate to the `Plugins` tab
   
   3. Search for and check the following plugins
      
      * `panoviewer`
      * `photo_geotagging`
      * `photoadjust`
   
   4. Click `OK` and then restart `JOSM`

5. The next step is to add the Metroparks map layer so that you can move images to line up with the official trail GPS tracks
   
   1. Go to `Edit` on the top and then click `Preferences`
   
   2. Navigate to the `Imagery` tab
   
   3. On the bottom right, there is a `+` button with the letters `TMS` below it, click the button
   
   4. In the first text box (where it says `Enter URL`), and then paste this URL: `tms:https://api.mapbox.com/styles/v1/cleveland-metroparks/cisvvmgwe00112xlk4jnmrehn/tiles/256/{z}/{x}/{y}@2x?access_token=????`
   
   5. Note!, this URL has to be modified to work. At the end of the URL is `access_token=????`. The `????` has to be replaced with the Metroparks Mapbox access token which can be found somewhere in LastPass (contact GIS).
   
   6. Once the URL is complete, then you can enter a name for the layer in the last text box. The name doesn't matter. I named mine `Metroparks`
   
   7. Click `OK`
   
   8. Let's make sure the imagery works
   
   9. Go to `Imagery` on the top and the click on the custom image layer we made (whatever you named it)
   
   10. The Metroparks map should show. The controls are `right mouse + drag` to pan around and `scroll` to zoom.
   
   11. I would highly recommend watching a short tutorial about the basics of `JOSM` such as on imagery layers, drawing lines, etc. Just to get the hang of it.
