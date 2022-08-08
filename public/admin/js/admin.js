var started = false;    // If started
var trailViewer;        // TrailViewer object
let text_input = document.getElementById("text_input");
let button = document.getElementById("add_info");
var mouseOnDot = false;

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

function deg2Rad(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

function updateArrowsRotation(angle) {
    let arrow = document.getElementById("my_arrow");
    let x = Math.sin(deg2Rad(angle)) * 100;
    let y = Math.cos(deg2Rad(angle)) * 100;
    let trans = "translate(-50%, -50%) translate(" + x + "px, " + y + "px) " + "rotateZ(" + ((360 - (angle + 180)) % 360) + "deg)";
    arrow.style.transform = trans;
}

function updateMarkerRotation() {
    if (trailViewer && trailViewer._panViewer) {
        let angle = trailViewer.getBearing();
        // updateArrowsRotation(angle);
       // current_marker.setRotation((angle + 225) % 360);
    }
}

// var t = setInterval(updateMarkerRotation, 100);

$('#pitch_range').on('change', () => {
    $('#pitch_label').text("Sequence Pitch Correction: " + $('#pitch_range').val());
    dataArr = trailViewer._dataArr;
    for (let i = 0; i < dataArr.length; i++) {
        if (dataArr[i]['sequenceName'] == trailViewer.getCurrentSequenceName()) {
            dataArr[i]['pitchCorrection'] = $('#pitch_range').val();
        }
    }
    trailViewer.setData(dataArr);
});

$('#pitch_set_btn').on('click', () => {
    $.post("/api/update-images.php", JSON.stringify({
        'sequenceName': trailViewer.getCurrentSequenceName(),
        'key': 'pitchCorrection',
        'value': $('#pitch_range').val(),
    }),
    function (data, textStatus, jqXHR) {
        console.log("Update Response: " + data);
        trailViewer._fetchData();
    },
    "json"
    );
});

$('#pitch_preview_btn').on('click', () => {
    trailViewer._panViewer.lookAt(0, 90, 120, false);
});

if (darkmode.getSavedColorScheme() == 'light') {
    setDark(false);
} else {
    setDark(true);
}

$('#flip_switch').change(() => {
    if (trailViewer.getFlipped() == $('#flip_switch').is(':checked')) {
        return;
    }
    let checked = $('#flip_switch').is(':checked');
    $.post("/api/update-images.php", JSON.stringify({
            'sequenceName': trailViewer.getCurrentSequenceName(),
            'key': 'flipped',
            'value': checked,
        }),
        function (data, textStatus, jqXHR) {
            console.log("Update Response: " + data);
            trailViewer._fetchData();
        },
        "json"
    );
})

let dark_switch = document.getElementById("dark_switch");
dark_switch.addEventListener('change', function() {
    setDark(dark_switch.checked);
});

var click_delete = false;

let click_delete_switch = document.getElementById("click_delete_switch");
click_delete_switch.addEventListener('change', function() {
    click_delete = dark_switch.checked;
});

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

let delete_button = document.getElementById('delete_button');
delete_button.addEventListener('click', function() {
    if (confirm("Are you sure??\nThis will permanently remove the trail!\nNOTE: Trails that are processing cannot be removed!\nPress OK to delete!") == true) {
        let data = {
            'name': String(trailViewer.getCurrentSequenceName()),
        };
        $.post('/admin/api/delete_trail.php', data);
    }
});

button.onclick = function() {
    let data = {
        'ImageID': String(trailViewer.getCurrentImageID()),
        'Pitch': trailViewer._panViewer.getPitch(),
        'Yaw': trailViewer._panViewer.getYaw(),
        'HoverText': text_input.value,
    };
    $.post('/admin/api/create_trailinfo.php', data);
    delay(500).then(() => trailViewer._updateInfo());
};

function onHotSpotClicked(id) {
    if (document.getElementById("click_delete_switch").checked == true) {
        if (confirm("Delete info?\nPress OK to confirm.") == true) {
            let data = {
                'ID': String(id),
            };
            $.post('/admin/api/delete_trailinfo.php', data);
            delay(500).then(() => trailViewer._updateInfo());
        }
    }
}

function updateMarkerRotation() {
    if (trailViewer && trailViewer._panViewer && currentMarker) {
        let angle = trailViewer.getBearing();
        currentMarker.setRotation((angle + 225) % 360);
    }
}

function onInitDone(viewer) {
    // Update map marker rotation on a set interval
    setInterval(updateMarkerRotation, 13);

    // Update nav arrow rotation on a set interval
    setInterval(updateNavArrows, 13);
}

function createMapLayer(data) {
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
                'imageID': data[i]['id']
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [data[i]['longitude'], data[i]['latitude']]
            }
        }
        features.push(f);
    }
    layerData['data']['features'] = features;
    map.addSource('dots', layerData);

    map.addLayer({
        'id': 'dots',
        'type': 'circle',
        'source': 'dots',
        'paint': {
            'circle-radius': 10,
            'circle-color': '#00a108',
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
            'type': 'standard'
        },
        function (data, textStatus, jqXHR) {
            init(data['imagesStandard']);
        }
    );
}

/**
 * 
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

function startViewer(data) {
    if (started == true) {
        trailViewer.destroy();
    }
    started = true;

    trailViewer = new TrailViewer({'onSceneChangeFunc': onViewerSceneChange,
                                   'onGeoChangeFunc': onGeoChange,
                                   'onArrowsAddedFunc': populateArrows,
                                   'onHotSpotClickFunc': onHotSpotClicked,
                                   'onInitDoneFunc': onInitDone,
                                   }, null, data);
}

var dataArr = null;

function init(data) {
    originalDataArr = data;
    dataArr = data;
    startMap(data);
    startViewer(data);
}


// function fetchStatus() {
//     var xmlhttp = new XMLHttpRequest();
//     var url = "/admin/api/status.php";
//     xmlhttp.onreadystatechange = function() {
//         if (this.readyState == 4 && this.status == 200) {
//             try {
//                 setStatus(JSON.parse(this.responseText));
//             } catch (error) {
//                 console.log(error);
//             }
//         }
//     };
//     xmlhttp.open("GET", url, true);
//     xmlhttp.send();
// }

function onViewerSceneChange(id) {
    // fetchStatus();
    $('#image-id').val(id.id);
    if (trailViewer) {
        let sequenceName = trailViewer.getCurrentSequenceName();
        if (sequenceName != $('#sequence_select').val()) {
            $('#sequence_select').val(String(sequenceName));
            onSequenceChange();
        }
        $('#flip_switch').prop('checked', trailViewer.getFlipped());
        if (trailViewer.getFlipped()) {
            $('#pitch_range').val(trailViewer._panViewer.getHorizonPitch());
        } else {
            $('#pitch_range').val(-trailViewer._panViewer.getHorizonPitch());
        }
        $('#pitch_label').text("Pitch Correction: " + $('#pitch_range').val());
    }
}

function start(seq, imageID = null) {
    if (started == true) {
        trailViewer.destroy();
    }

    started = true;

    //var view = startViewer(seq);
    trailViewer = new TrailViewer({
                                   'onGeoChangeFunc': onGeoChange,
                                   'onHotSpotClickFunc': onHotSpotClicked}, 
    imageID, null);

    document.getElementById('panorama').scrollIntoView(true);
}



// function setStatus(statusJson) {
//     for (let i = 0; i < statusJson['Status'].length; i++) {
//         if (statusJson['Status'][i]['Name'] == String(trailViewer.getCurrentSequenceName())) {
//             if (statusJson['Status'][i]['Status'] != 'Done') {
//                 document.getElementById('processing_status').hidden = false;
//             } else {
//                 document.getElementById('processing_status').hidden = true;
//             }
//             if (statusJson['Status'][i]['Flipped'] == 0) {
//                 document.getElementById('flip_switch').checked = false;
//             } else {
//                 document.getElementById('flip_switch').checked = true;
//             }
//         }
//     }
// }

var currentMarker;
var map;

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
    map.on('load', function() {
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


var currentMarkers = []

function createGeoSequence(geoSeqJson) {
    for (let i = 0; i < currentMarkers.length; i++) {
        currentMarkers[i].remove();
    }
    geoSeq = geoSeqJson['geo_data'];
    // for (let i = 0; i < geoSeq.length; i++) {
    //     const el = document.createElement('div');
    //     el.classList.add('marker');
    //     el.dataset.imageId = geoSeq[i]['id'];
    //     el.addEventListener('click', (evt) => {
    //         trailViewer.goToScene(evt.currentTarget.dataset.imageId);
    //         console.log(evt.currentTarget.dataset.imageId);
    //     })
    //     let marker = new mapboxgl.Marker(el)
    //         .setLngLat([geoSeq[i]['longitude'], geoSeq[i]['latitude']])
    //         .addTo(map);
    //     currentMarkers.push(marker);
    // }
    let data = {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': []
        }
    }
    let features = [];
    for (let i = 0; i < geoSeq.length; i++) {
        let f = {
            'type': 'Feature',
            'properties': {
                'imageID': geoSeq[i]['id']
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [geoSeq[i]['longitude'], geoSeq[i]['latitude']]
            }
        }
        features.push(f);
    }
    data['data']['features'] = features;
    map.addSource('dots', data);
    map.addLayer({
        'id': 'dots',
        'type': 'symbol',
        'source': 'dots',
        'layout': {
            'icon-image': 'dot',
            'icon-size': 0.2,
            'icon-allow-overlap': false,
            'icon-padding': 2,
        }
        });

}

function onGeoChange(geo) {
    if (currentMarker != null) {
        currentMarker.setLngLat([geo['longitude'], geo['latitude']]);
        map.easeTo({
            center: currentMarker.getLngLat(),
            duration: 500,
        });
    }
}


function getReservations() {
    var xmlhttp = new XMLHttpRequest();
    var url = "/api/reservations.php";
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            InitSelectReservation(JSON.parse(this.responseText));
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

function InitSelectReservation(resJson) {
    let reservationSelect = document.getElementById("res_select");
    for (let i = 0; i < resJson['Reservations'].length; i++) {
        let option = document.createElement('option');
        option.innerHTML = resJson['Reservations'][i]['Name'];
        reservationSelect.appendChild(option);
    }
    reservationSelect.addEventListener('change', getSequences);
}

function getSequences() {
    let xmlhttp = new XMLHttpRequest();
    let url = '/api/trails.php';
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            updateSequenceSelect(JSON.parse(this.responseText));
        }
    };
    xmlhttp.open('GET', url, true);
    xmlhttp.send();
}

var sequences;

function updateSequenceSelect(seqJson) {
    sequences = seqJson;
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
    for (let i = 0; i < seqJson['Trails'].length; i++) {
        let option = document.createElement('option');
        option.innerHTML = seqJson['Trails'][i]['Name'];
        option.value = seqJson['Trails'][i]['Name'];
        sequenceSelect.appendChild(option);
    }
    sequenceSelect.addEventListener('change', onSequenceChange);
}

$('#sequence_select').change(onSequenceChange);

function onSequenceChange() {
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
        

    // fetchStatus();
    //start(sequence);
}

getSequences();

fetchData();
