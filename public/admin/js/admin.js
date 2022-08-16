var started = false;    // If started
var trailViewer;        // TrailViewer object
var mouseOnDot = false; // If mouse is hovering over map dots (used for cursor changing)
var isDownloading = false;  // If a sequence download is occuring
var dataArr = null; // Base data for TrailViewer
var currentMarker; // Current TrailView marker on mapbox map
var map;    // Mapbox map object

/**
 * Sets dark mode for the admin page
 * @param {Boolean} dark - true if dark is enabled
 */
function setDark(dark) {
    let dark_switch = document.getElementById('dark_switch');
    if (dark) {
        dark_switch.checked = true;
        darkmode.setDarkMode(true);
        document.body.style.background = '#222222';
    } else {
        dark_switch.checked = false;
        darkmode.setDarkMode(false);
        document.body.style.background = '#ffffff';
    }
}

/**
 * Converts degress to radians
 * @param {Number} degrees 
 * @returns {Number} Returns radians
 */
function deg2Rad(degrees) {
    var pi = Math.PI;
    return degrees * (pi / 180);
}

/**
 * Updates navigation arrow rotation/transformation
 * Called by setInterval()
 */
function updateMarkerRotation() {
    if (trailViewer && trailViewer._panViewer && currentMarker) {
        let angle = trailViewer.getBearing();
        currentMarker.setRotation((angle + 225) % 360);
    }
}

/**
 * Called when TrailViewer is done initializing
 * @param {TrailViewer} viewer - The initialized TrailViewer object
 */
function onInitDone(viewer) {
    // Update map marker rotation on a set interval
    setInterval(updateMarkerRotation, 13);

    // Update nav arrow rotation on a set interval
    setInterval(updateNavArrows, 13);
    trailViewer = viewer;
    onViewerSceneChange(viewer._currImg);
}

/**
 * Create/recreates the mapbox layer for TrailView dots
 * @param {Object} data - TrailView base data
 */
function createMapLayer(data) {
    if (map.getSource('dots')) {
        map.removeLayer('dots');
        map.removeSource('dots');
    }

    let layerData = {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': []
        }
    }
    let features = [];
    for (let i = 0; i < data.length; i++) {
        let f = {
            'type': 'Feature',
            'properties': {
                'sequenceName': data[i]['sequence'],
                'imageID': data[i]['id'],
                'visible': data[i]['visibility']
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [data[i]['longitude'], data[i]['latitude']]
            }
        }
        features.push(f);
    }
    layerData['data']['features'] = features
    map.addSource('dots', layerData);

    map.addLayer({
        'id': 'dots',
        'type': 'circle',
        'source': 'dots',
        'paint': {
            'circle-radius': 10,
            'circle-color': [
                'case',
                ['==', ['get', 'visible'], true],
                '#00a108',
                '#db8904'
            ],
        }
    });
    map.setPaintProperty('dots', 'circle-radius', [
        'interpolate',

        ['exponential', 0.5],
        ['zoom'],
        13,
        3,

        16,
        5,

        17,
        7,

        20,
        8
    ]);
    map.setPaintProperty('dots', 'circle-opacity', [
        'interpolate',

        ['exponential', 0.5],
        ['zoom'],
        13,
        0.05,

        15,
        0.1,

        17,
        0.25,

        20,
        1
    ]);
}


/**
 * Updates navigation arrows transform
 * Called by setInterval()
 */
function updateNavArrows() {
    if (trailViewer) {
        // Arrow rotation
        $('.new_nav').each(function (index, element) {
            let yaw = customMod(((360 - angle180to360(trailViewer._panViewer.getYaw())) + $(element).data('yaw')), 360);
            $(element).css('transform', 'rotateZ(' + yaw + 'deg) translateY(-100px)');
        });
        // Container rotation
        let rot = (trailViewer._panViewer.getPitch() + 90) / 2.0;
        if (rot > 80) {
            rot = 80
        } else if (rot < 0) {
            rot = 0;
        }
        $('#nav_container').css('transform', 'perspective(300px) rotateX(' + rot + 'deg)');
    }
}

/**
 * Called when navigation arrow is clicked
 * @param {String} id - Image ID to navigate to
 */
function navArrowClicked(id) {
    trailViewer.goToImageID(id);
}

function fetchData() {
    $.getJSON("/api/images.php", {
        'type': 'all'
    },
        function (data, textStatus, jqXHR) {
            init(data['imagesAll']);
        }
    );
}

/**
 * Populates navigation arrows on TrailViewer container
 * Used as a callback on TrailView object
 * @param {Object} hotspots - JSON object from pannellum config
 */
function populateArrows(hotspots) {
    $('.new_nav').remove();
    if (!hotspots) {
        return;
    }
    for (let i = 0; i < hotspots.length; i++) {
        let link = document.createElement('img');
        $(link).addClass('new_nav');
        $(link).attr('src', '/assets/images/ui/arrow_new_small_white.png');
        $(link).data('yaw', hotspots[i].yaw);
        $(link).data('id', hotspots[i]['clickHandlerArgs']['id']);
        $(link).hide(0);
        $(link).click(function (e) {
            e.preventDefault();
            navArrowClicked($(this).data('id'));
            $('.new_nav').fadeOut(10);
        });
        $(link).attr('draggable', false);
        //$(link).css('transform', 'rotateZ(' + hotspots[i].yaw + 'deg) translateY(-100px)');
        $('#nav_container').append($(link));
    }
    updateNavArrows();
    $('.new_nav').fadeIn(200);

}

/**
 * Initializes TrailViewer
 * @param {Object} data - TrailView base data 
 */
function startViewer(data) {
    if (started == true) {
        trailViewer.destroy();
    }
    started = true;

    trailViewer = new TrailViewer({
        'onSceneChangeFunc': onViewerSceneChange,
        'onGeoChangeFunc': onGeoChange,
        'onArrowsAddedFunc': populateArrows,
        'onInitDoneFunc': onInitDone,
        'imageFetchType': 'all',
    }, null, data);
}

/**
 * Called when base TrailView data has been fetched
 * @param {Object} data - base TrailView data 
 */
function init(data) {
    dataArr = data;
    startMap(data);
    startViewer(data);
}

/**
 * Used as callback when TrailView scene/img changes
 * @param {Object} img - Scene object that is being changed to
 */
function onViewerSceneChange(img) {
    // fetchStatus();
    $('#image-id').val(img.id);
    if (trailViewer) {
        let sequenceName = trailViewer.getCurrentSequenceName();
        if (sequenceName != $('#sequence_select').val()) {
            $('#sequence_select').val(String(sequenceName));
            onSequenceUIChange();
        }
        $('#flip_switch').prop('checked', trailViewer.getFlipped());
        if (trailViewer.getFlipped()) {
            $('#pitch_range').val(trailViewer._panViewer.getHorizonPitch());
        } else {
            $('#pitch_range').val(-trailViewer._panViewer.getHorizonPitch());
        }
        $('#pitch_label').text("Pitch Correction: " + $('#pitch_range').val());
        for (let i = 0; i < dataArr.length; i++) {
            if (dataArr[i].id == img.id) {
                isVisible = dataArr[i].visibility;
                break;
            }
        }
        $('#visibility_switch').prop('checked', isVisible);
        $('#img_visibility_switch').prop('checked', isVisible);
    }
}

/**
 * Initializes the MapBox map
 * @param {Object} data - Base TrailView data 
 */
function startMap(data) {
    // Create map
    mapboxgl.accessToken = mapboxKey;
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/cleveland-metroparks/cisvvmgwe00112xlk4jnmrehn?optimize=true',
        center: [-81.6826650, 41.4097766],
        zoom: 9.5,
        pitchWithRotate: false,
        dragRotate: false,
        touchPitch: false,
        boxZoom: false,
    });

    // Once loaded, create dots layer
    map.on('load', function () {
        createMapLayer(data);
    });

    // Update visual cursor
    map.on("mouseenter", 'dots', () => {
        mouseOnDot = true;
        map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", 'dots', () => {
        mouseOnDot = false;
        map.getCanvas().style.cursor = "grab";
    });

    map.on('mousedown', () => {
        if (!mouseOnDot) {
            map.getCanvas().style.cursor = "grabbing";
        }
    });

    map.on('mouseup', () => {
        if (mouseOnDot) {
            map.getCanvas().style.cursor = 'pointer';
        } else {
            map.getCanvas().style.cursor = 'grab';
        }
    })

    // Create currentMarker icon
    const currentMarker_wrap = document.createElement('div');
    currentMarker_wrap.classList.add('marker_current_wrapper');
    const currentMarker_div = document.createElement('div');
    currentMarker_div.classList.add('marker_current');
    const currentMarker_view_div = document.createElement('div');
    currentMarker_view_div.classList.add('marker_viewer');
    currentMarker_wrap.appendChild(currentMarker_div);
    currentMarker_wrap.appendChild(currentMarker_view_div);
    currentMarker = new mapboxgl.Marker(currentMarker_wrap)
        .setLngLat([-81.6826650, 41.4097766])
        .addTo(map)
        .setRotationAlignment('map');

    map.jumpTo({
        center: currentMarker.getLngLat(),
        zoom: 16,
        bearing: 0,
    });

    // Handle when dots are clicked
    map.on('click', 'dots', (e) => {
        trailViewer.goToImageID(e.features[0].properties.imageID);
    });
}

/**
 * Used as callback for when scene geo location changes on TrailViewer
 * @param {Object} geo - lat & lng object {'latitude', 'longitude'}
 */
function onGeoChange(geo) {
    if (currentMarker != null) {
        currentMarker.setLngLat([geo['longitude'], geo['latitude']]);
        map.easeTo({
            center: currentMarker.getLngLat(),
            duration: 500,
        });
    }
}

/**
 * Fetches and populates sequence data for selection UI
 * Called on page load
 */
function populateSequencesUI() {
    $.ajax({
        type: "GET",
        url: "/api/trails.php",
        dataType: "application/json",
        complete: function (jqXHR, textStatus) {
            let data = JSON.parse(jqXHR.responseText);
            if (data.status == 200) {
                let sequenceSelect = document.getElementById('sequence_select');
                while (sequenceSelect.firstChild) {
                    sequenceSelect.removeChild(sequenceSelect.firstChild);
                }
                // disabled selected value
                let emptyOption = document.createElement('option');
                emptyOption.setAttribute('disabled', '');
                emptyOption.setAttribute('selected', '');
                emptyOption.setAttribute('value', '');
                emptyOption.innerHTML = 'Select a Sequence';
                sequenceSelect.appendChild(emptyOption);
                for (let i = 0; i < data['trails'].length; i++) {
                    let option = document.createElement('option');
                    option.innerHTML = data['trails'][i]['name'];
                    option.value = data['trails'][i]['name'];
                    sequenceSelect.appendChild(option);
                }
                sequenceSelect.addEventListener('change', onSequenceUIChange);
            } else {
                alert('Error fetching sequence data\n' + data.detail);
            }
        }
    });
}

/**
 * Called when sequence UI selection changes
 */
function onSequenceUIChange() {
    let sequenceSelect = document.getElementById('sequence_select');
    let sequence = sequenceSelect.options[sequenceSelect.selectedIndex].text;
    if (dataArr !== null && trailViewer.getCurrentSequenceName() != sequence) {
        for (let i = 0; i < dataArr.length; i++) {
            if (dataArr[i]['sequenceName'] == sequence) {
                if (trailViewer !== null) {
                    trailViewer.goToImageID(dataArr[i]['id']);
                }
                return;
            }
        }
    }
}

/**
 * Updates status table
 * Called by updateStatuses()
 * @param {Object} data - Status data
 */
function updateStatusTable(data) {
    for (let i = 0; i < data.length; i++) {
        if (data[i].Status != 'Done' || data[i].ToDelete != 0) {
            let row = document.createElement('tr');

            let name = document.createElement('td');
            name.innerHTML = data[i].Name;
            row.appendChild(name);

            let status = document.createElement('td');
            status.innerHTML = data[i].Status;
            row.appendChild(status);

            let toDelete = document.createElement('td');
            toDelete.innerHTML = data[i].ToDelete == 1 ? true : false;
            row.appendChild(toDelete);

            $('#status_table_body').append(row);
        }
    }
}

/**
 * Updates status table
 */
function updateStatuses() {
    $.getJSON("/api/status.php", {},
        function (data, textStatus, jqXHR) {
            updateStatusTable(data['Status'])
        }
    );
}

// On sequence select change
$('#sequence_select').change(onSequenceUIChange);

// On delete button clicked
$('#delete_button').on('click', () => {
    let name = $('#sequence_select option:selected').text()
    if (confirm("Are you sure??\nThis will delete trail: " + name + "\nDeleted trails are moved to a different folder so can possibly be recovered.\nThis can take a while.\nPress OK to delete!") == true) {
        let data = {
            'name': name,
        };
        $.post('/api/mark-delete-trail.php', JSON.stringify(data));
        alert("Trail: " + name + "\nhas been marked for deletion.\nThis could take a while.");
    }
});

// On dark toggle switch change
$('#dark_switch').on('change', () => {
    setDark($('#dark_switch').is(':checked'));
});

// On pitch slider input (while sliding)
$('#pitch_range').on('input', () => {
    $('#pitch_label').text("Sequence Pitch Correction: " + $('#pitch_range').val());
});

// On pitch slider change (when done sliding)
$('#pitch_range').on('change', () => {
    for (let i = 0; i < dataArr.length; i++) {
        if (dataArr[i]['sequenceName'] == trailViewer.getCurrentSequenceName()) {
            dataArr[i]['pitchCorrection'] = $('#pitch_range').val();
        }
    }
    trailViewer.setData(dataArr);
});

// On pitch set button click
$('#pitch_set_btn').on('click', () => {
    let seqName = trailViewer.getCurrentSequenceName();
    let pitchVal = $('#pitch_range').val();
    $.post("/api/update-images.php", JSON.stringify({
        'sequenceName': seqName,
        'key': 'pitchCorrection',
        'value': pitchVal,
    }),
        function (data, textStatus, jqXHR) {
            console.log("Update Response: " + data);
            for (let i = 0; i < dataArr.length; i++) {
                if (dataArr[i].sequenceName == seqName) {
                    dataArr[i].pitchCorrection = pitchVal;
                }
            }
            trailViewer._data = dataArr;
            trailViewer.goToImageID(trailViewer.getCurrentImageID(), true);
        },
        "json"
    );
});

// On sequence download button click
$('#download_btn').on('click', () => {
    if (isDownloading == false) {
        let downloadTrail = trailViewer.getCurrentSequenceName();
        if (!confirm("Are you sure you want to start downloading: " + downloadTrail + "?")) {
            return;
        }
        isDownloading = true;
        window.onbeforeunload = function () {
            return true;
        };
        $('#download_complete_alert').hide();
        $('#zipping_alert').show();
        $('#zipping_text').html("Zipping trail: " + downloadTrail);
        $.getJSON("/api/download-images.php", {
            'name': downloadTrail
        },
            function (data, textStatus, jqXHR) {
                if (data['status'] == 200) {
                    $('#zipping_alert').hide();
                    $('#download_complete_alert').show().html("Success!: <a href='" + data['link'] + "'>Download " + downloadTrail + "</a>");
                } else {
                    alert('Download failed!');
                }
                isDownloading = false;
                window.onbeforeunload = null;
            }
        );
    } else {
        alert("Another download is in progress, only one request at a time.");
    }

});

// On pitch view side button click
$('#pitch_preview_btn').on('click', () => {
    trailViewer._panViewer.lookAt(0, 90, 120, false);
});

// On sequence flip switch change
$('#flip_switch').on('change', () => {
    if (trailViewer.getFlipped() == $('#flip_switch').is(':checked')) {
        return;
    }
    let checked = $('#flip_switch').is(':checked');
    let seqName = trailViewer.getCurrentSequenceName()
    $.post("/api/update-images.php", JSON.stringify({
        'sequenceName': seqName,
        'key': 'flipped',
        'value': checked,
    }),
        function (data, textStatus, jqXHR) {
            console.log("Update Response: " + data);
            for (let i = 0; i < dataArr.length; i++) {
                if (dataArr[i].sequenceName == seqName) {
                    dataArr[i].flipped = checked;
                }
            }
            trailViewer._data = dataArr;
            trailViewer.goToImageID(trailViewer.getCurrentImageID(), true);
        },
        "json"
    );
});

// On sequence visibility switch change
$('#visibility_switch').on('change', () => {
    let checked = $('#visibility_switch').is(':checked');
    let seqName = trailViewer.getCurrentSequenceName();
    let same = true;
    let sameVal = null;
    for (let i = 0; i < dataArr.length; i++) {
        if (dataArr[i].sequenceName == seqName) {
            if (sameVal == null) {
                sameVal = dataArr[i].visibility;
            } else {
                if (dataArr[i].visibility != sameVal) {
                    same = false;
                    break;
                }
            }
        }
    }
    if (!same) {
        if (!confirm("There are images in the sequence with specific visibility options set.\nAre you sure you want to override all the visibility settings for the images in this sequence?")) {
            $('#visibility_switch').prop('checked', !$('#visibility_switch').is(':checked'));
            return;
        }
    }
    $.post("/api/update-images.php", JSON.stringify({
        'sequenceName': seqName,
        'key': 'visibility',
        'value': checked,
    }),
        function (data, textStatus, jqXHR) {
            console.log("Update Response: " + data);
            for (let i = 0; i < dataArr.length; i++) {
                if (dataArr[i].sequenceName == seqName) {
                    dataArr[i].visibility = checked;
                }
            }
            trailViewer._data = dataArr;
            trailViewer.goToImageID(trailViewer.getCurrentImageID(), true);
            createMapLayer(dataArr);
        },
        "json"
    );
});

// On image visibility switch change
$('#img_visibility_switch').on('change', () => {
    let checked = $('#img_visibility_switch').is(':checked');
    let imgId = trailViewer.getCurrentImageID()
    $.post("/api/update-images.php", JSON.stringify({
        'id': imgId,
        'key': 'visibility',
        'value': checked,
    }),
        function (data, textStatus, jqXHR) {
            console.log("Update Response: " + data);
            for (let i = 0; i < dataArr.length; i++) {
                if (dataArr[i].id == imgId) {
                    dataArr[i].visibility = checked;
                    trailViewer._data = dataArr;
                    trailViewer.goToImageID(trailViewer.getCurrentImageID(), true);
                    createMapLayer(dataArr);
                    break;
                }
            }
        },
        "json"
    );
});

// Update dark mode from previous session
if (darkmode.getSavedColorScheme() == 'light') {
    setDark(false);
} else {
    setDark(true);
}

// Update status table
updateStatuses();

// Populate sequence selection UI
populateSequencesUI();

// fetch base TrailView data (then calls init())
fetchData();
