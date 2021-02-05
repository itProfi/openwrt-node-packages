const fs = require('fs');
const os = require('os');
const cp = require('child_process');
const crypto = require('crypto');
const https = require('https');
const urlParse = require('url').parse;
const googleTTS = require('google-tts-api');

module.exports = {
    getState,
    getIlluminance,
    getLamp,
    setLamp,
    getPlay,
    setPlay,
    getVolume,
    setVolume,
    setSay
}

const common = require('./common');
const mqtt = require('./mqtt_client');

//////////////////

let device = {
    identifiers: ['xiaomi_gateway' + common.mac],
    name: 'Xiaomi_Gateway' + common.mac,
    sw_version: '1.0',
    model: 'Xiaomi Gateway',
    manufacturer: 'Xiaomi'
}

let state = {
    state_topic: common.config.mqtt_topic + '/state',
    value: 'online'
}

// Начальные параметры лампы
let lamp = {
    state_topic: common.config.mqtt_topic + '/light',
    value: {
        color: {
            r: 30,
            g: 30,
            b: 30
        },
        state: 'OFF',
        brightness: 0
    },

    real_color: {
        r: 0,
        g: 0,
        b: 0
    },

    path: {
        r: '/sys/class/backlight/lumi_r/brightness',
        g: '/sys/class/backlight/lumi_g/brightness',
        b: '/sys/class/backlight/lumi_b/brightness'
    },

    config_topic: 'homeassistant/light/lumi' + common.mac + '_light/config',
    homeassistant: {
        name: 'Lumi Light',
        uniq_id: 'lumi' + common.mac + '_light',
        schema: 'json',
        rgb: true,
        stat_t: common.config.mqtt_topic + '/light',
        cmd_t: common.config.mqtt_topic + '/light/set',
        device: device
    }
}

let illuminance = {
    state_topic: common.config.mqtt_topic + '/illuminance',
    value: 0,

    config_topic: 'homeassistant/sensor/lumi' + common.mac + '_illuminance/config',
    homeassistant: {
        name: 'Lumi Illuminance',
        uniq_id: 'lumi' + common.mac + '_illuminance',
        dev_cla: 'illuminance',
        unit_of_meas: 'lx',
        stat_t: common.config.mqtt_topic + '/illuminance',
        device: device
    }
}

let button = {
    state_topic: common.config.mqtt_topic + '/button',
    value: 0,

    device: '/dev/input/event0',
    options: {
        flags: 'r',
        encoding: null,
        fd: null,
        autoClose: true
    },

    config_topic: 'homeassistant/device_automation/lumi' + common.mac + '_button/config',
    homeassistant: {
        automation_type: 'trigger',
        topic: common.config.mqtt_topic + '/button',
        type: 'button_short_press',
        subtype: 'button_1',
        device: device
    }
}

let audio = {
    play: {
        state_topic: common.config.mqtt_topic + '/audio/play',
        value: {
            url: 'STOP',
            name: ''
        }
    },
    volume: {
        state_topic: common.config.mqtt_topic + '/audio/volume',
        value: 0
    }
}

///////////////

// Отправляем данные о статусе шлюза
function getState() {
    mqtt.publish(state);
    getIlluminance();
    getLamp();
    getPlay();
    getVolume();

    if (common.config.homeassistant) {
        mqtt.publish_homeassistant(lamp);
        mqtt.publish_homeassistant(illuminance);
        mqtt.publish_homeassistant(button);
    }
}

// Отправляем данные датчика освещенности
function getIlluminance(treshhold = 0) {
    let ill_prev = illuminance.value;
    illuminance.value = parseInt(fs.readFileSync('/sys/bus/iio/devices/iio:device0/in_voltage5_raw'));
    if (Math.abs(illuminance.value - ill_prev) > treshhold) {
        mqtt.publish(illuminance);
    }
}

// Получаем текущее состояние лампы
function getLamp() {
    lamp.real_color.r = parseInt(fs.readFileSync(lamp.path.r).toString());
    lamp.real_color.g = parseInt(fs.readFileSync(lamp.path.g).toString());
    lamp.real_color.b = parseInt(fs.readFileSync(lamp.path.b).toString());

    lamp.brightness = Math.round(0.2126 * lamp.real_color.r + 0.7152 * lamp.real_color.g + 0.0722 * lamp.real_color.b);

    if (lamp.real_color.r + lamp.real_color.g + lamp.real_color.b > 0) {
        lamp.value.state = 'ON';
        mqtt.publish(lamp);
    } else {
        lamp.value.state = 'OFF';
        // Публикуем только состояние, чтобы не потерять последний заданный цвет
        mqtt.publish({state_topic: lamp.state_topic, value: {state: lamp.value.state}});
    }
}

// Меняем состояние лампы в зависимости от полученных данных
function setLamp(message) {
    try {
        let state;
        let msg = JSON.parse(message);
        if (msg.state) {
            state = msg.state.toUpperCase();
        } else {
            state = msg.toUpperCase();
        }

        if (state === 'OFF') {
            fs.writeFileSync(lamp.path.r, 0);
            fs.writeFileSync(lamp.path.g, 0);
            fs.writeFileSync(lamp.path.b, 0);
        }
        if (state === 'ON') {
            if (msg.color) {
                lamp.value.color.r = msg.color.r;
                lamp.value.color.g = msg.color.g;
                lamp.value.color.b = msg.color.b;
            }
            fs.writeFileSync(lamp.path.r, Math.round(lamp.value.color.r * 100 / 255));
            fs.writeFileSync(lamp.path.g, Math.round(lamp.value.color.g * 100 / 255));
            fs.writeFileSync(lamp.path.b, Math.round(lamp.value.color.b * 100 / 255));
        }
    } catch (e) {
        common.myLog(e, common.colors.red);
        //sayText('Произошла ошибка!', 'ru');
    }
    getLamp();
}

// Получаем состояние проигрывателя
function getPlay() {
    audio.play.value.name = cp.execSync("mpc current --format '%name% - %artist% - %title%'").toString().replace(/ -  -/g, ' -').replace('\n', '');
    if (audio.play.value.name.length < 5) {
        audio.play.value.name = audio.play.value.url;
    }
    mqtt.publish(audio.play);
}

// Включаем/выключаем проигрыватель
function setPlay(message) {
    try {
        let msg = JSON.parse(message);

        if (msg.volume) {
            setVolume(msg.volume);
        } else {
            setVolume(msg);
        }

        let url;
        if (msg.url) {
            url = msg.url.toLowerCase();
        } else {
            url = msg.toLowerCase();
        }

        if (url.length < 5) {
            audio.play.value.url = 'STOP';
            cp.execSync('mpc stop');
        } else {
            audio.play.value.url = url;
            if (url.substring(0,4) == 'http') {
                cp.execSync('mpc clear && mpc add ' + audio.play.value.url + ' && mpc play');
            } else {
                cp.execSync('mpg123 ' + url);
            }
        }

        setTimeout(() => {
            getPlay();
        }, 1 * 1000);
    } catch (e) {
        common.myLog(e, common.colors.red);
        sayText('Произошла ошибка!', 'ru');
    }
}

// Получаем состояние о громкости
function getVolume() {
    audio.volume.value = cp.execSync("amixer get Master | awk '$0~/%/{print $4}' | tr -d '[]%'").toString().split(os.EOL)[0];
    mqtt.publish(audio.volume);

    return audio.volume.value;
}

// Устанавливаем громкость
function setVolume(volume) {
    cp.execSync('amixer sset Master ' + volume + '%');
    getVolume();
}

// Произнести указанный текст
function setSay(message) {
    try {
        let msg = JSON.parse(message);

        let lang = 'ru';
        if (msg.lang) {
            lang = msg.lang;
        }

        let text = 'Ошибка';
        if (msg.text) {
            text = msg.text;
        } else {
            text = msg;
        }

        if (audio.play.value.url !== 'STOP') {
            cp.execSync('mpc pause');
        }

        let vol = getVolume();
        if (msg.volume) {
            setVolume(msg.volume);
        }

        sayText(text, lang);

        if (msg.volume) {
            setVolume(vol);
        }
        if (audio.play.value.url !== 'STOP') {
            cp.execSync('mpc play');
        }
    } catch (e) {
        common.myLog(e, common.colors.red);
        sayText('Произошла ошибка!', 'ru');
    }
}

function sayText(text, lang) {
    if (text.length > 3) {
        let md5sum = crypto.createHash('md5');
        md5sum.update(text);
        const file = '/tmp/' + md5sum.digest('hex');

        if (fs.existsSync(file)) {
            cp.execSync('mpg123 ' + file);
        } else {
            googleTTS(text, lang)
                .then((url) => {
                    return downloadFile(url, file);
                })
                .then(() => {
                    //console.log('Download success');
                    cp.execSync('mpg123 ' + file);
                    //fs.unlinkSync(file);
                })
                .catch((err) => {
                    console.error(err.stack);
                });
        }
    }
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const info = urlParse(url);
        const httpClient = info.protocol === 'https:' ? https : http;
        const options = {
            host: info.host,
            path: info.path,
            headers: {
                'user-agent': 'WHAT_EVER',
            },
        };

        httpClient
            .get(options, (res) => {
                // check status code
                if (res.statusCode !== 200) {
                    const msg = `request to ${url} failed, status code = ${res.statusCode} (${res.statusMessage})`;
                    reject(new Error(msg));
                    return;
                }

                const file = fs.createWriteStream(dest);
                file.on('finish', function () {
                    // close() is async, call resolve after close completes.
                    file.close(resolve);
                });
                file.on('error', function (err) {
                    // Delete the file async. (But we don't check the result)
                    fs.unlink(dest);
                    reject(err);
                });

                res.pipe(file);
            })
            .on('error', reject)
            .end();
    });
}

// Получаем данные о кнопке
fd = fs.createReadStream(button.device, button.options);
fd.on('data', function (buf) {
    let i, j, chunk = 16;
    for (i = 0, j = buf.length; i < j; i += chunk) {
        let event = {
            tssec: buf.readUInt32LE(i),
            tsusec: buf.readUInt32LE(i + 4),
            type: buf.readUInt16LE(i + 8),
            code: buf.readUInt16LE(i + 10),
            value: buf.readUInt32LE(i + 12)
        };
        if (event.type == 1 && event.code == 256) {
            button.value = event.value;
            mqtt.publish(button);
        }
    }
});
fd.on('error', function (e) {
    console.error(e);
});