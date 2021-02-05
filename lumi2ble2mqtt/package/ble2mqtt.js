var noble = require('@abandonware/noble');
const crypto = require("crypto");
//My MQTT////////////////////////////////
var mqtt = require('mqtt');
var mqtt_url = ("xxx.yyy.zzz"); //you mqtt server
var url = "mqtt://" + mqtt_url; 
var mqtt_topic = ('ble2mqtt');  //you root topic
var mqtt_options = {
    port: 1883, //you port
    clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
    username:"user",  //you username
    password: "password", //you password
    };
// Create a client connection
var mqttclient = mqtt.connect(url, mqtt_options);
mqttclient.on("connect",function(){	
  console.log("mqtt client for ble connected");
})
////////////////////////////////////////////////////////////////////
var RSSI_THRESHOLD    = -90;
//var EXIT_GRACE_PERIOD = 15000; // milliseconds
var ArBle = [];
const SERVICE_DATA_UUID = "fe95";
////
///let mi_ble = new xiaomi_ble(); // initialize xiaomi_ble
///

const FrameControlFlags = {
  isFactoryNew: 1 << 0,
  isConnected: 1 << 1,
  isCentral: 1 << 2,
  isEncrypted: 1 << 3,
  hasMacAddress: 1 << 4,
  hasCapabilities: 1 << 5,
  hasEvent: 1 << 6,
  hasCustomData: 1 << 7,
  hasSubtitle: 1 << 8,
  hasBinding: 1 << 9
};

const CapabilityFlags = {
  connectable: 1 << 0,
  central: 1 << 1,
  secure: 1 << 2,
  io: (1 << 3) | (1 << 4)
};

const EventTypes = {
  temperature: 4100,
  humidity: 4102,
  illuminance: 4103,
  moisture: 4104,
  fertility: 4105,
  battery: 4106,
  temperatureAndHumidity: 4109
};
 
//*************************************************************************************************************************** 
var arble=[]; 
var peripheralIdOrAddress ='?a4c138d24aa9';
///////////////////////////////////////
/*noble.on('stateChange', function(state) {
 if (state === 'poweredOn') 
      {noble.startScanning([], true);} 
  else {noble.stopScanning();}}); */

////
 ////////////////////////////////////////// ////noble.on('stateChange', function (state) {
 //  noble.startScanning([], true);
 ////////////////////////////////////////////// });
/////

// set an interval to rescan & get fresh data
setInterval(function () {
///  console.log('every 3 seconds, rescan devices');
  noble.startScanning([], true);
}, 3000);



////////////////////////////////////////
noble.on('discover', async(peripheral) => {

  if (peripheral.rssi < RSSI_THRESHOLD) {/*return;*/ }
  var id = peripheral.id;

	var bledev={};	
	Object.assign(bledev,{"id":(peripheral.id).toString()});
	Object.assign(bledev,{"uuid":peripheral.uuid.toString('hex')});
	Object.assign(bledev,{"address":peripheral.address.toString()});
	Object.assign(bledev,{"addressType":peripheral.addressType.toString()});
	Object.assign(bledev,peripheral.localName);	
	Object.assign(bledev,peripheral.connectable);
	Object.assign(bledev,peripheral.advertisement); 
	Object.assign(bledev,{"lastSeen":Date.now()}); 
  var entered = !ArBle[id];
if (entered) {
	ArBle[id] = { peripheral: peripheral};
		  arble.push(bledev);
	}

	ArBle[id].lastSeen = Date.now();
	noble.stopScanning(); //?
try{
		var result = new miParser(bledev.serviceData[0].data,'e85feb9d97474fcf329b0d611afb4e4a').parse();

		try{
		if (result.event['temperature']){
		var pyload=result.event.temperature+"";
		var state_topic=mqtt_topic+"/"+bledev.uuid+"/"+"ble"+"/"+"temperature"+"/state";	
		var anons= {
				"name": "temperature",//+"_"+bledev.uuid,//.substr(8, 8),
				"state_topic": state_topic,
				"unique_id": bledev.uuid+"temperature",
				"device": {"identifiers": [bledev.localName+bledev.uuid],"name": bledev.uuid+"_"+bledev.localName,"sw_version": "1.0","model": bledev.localName,"manufacturer": "zesp"},
				"device_class": "temperature"
			};
		    mqttclient.publish(state_topic,pyload,{retain:false}, function(){});	
            
		}

		if (result.event['humidity']){
		var pyload=result.event.humidity+"";
		var state_topic=mqtt_topic+"/"+bledev.uuid+"/"+"ble"+"/"+"humidity"+"/state";	
		var anons= {
				"name": "humidity",//+"_"+bledev.uuid,//.substr(8, 8),
				"state_topic": state_topic,
				"unique_id": bledev.uuid+"humidity",
				"device": {"identifiers": [bledev.localName+bledev.uuid],"name": bledev.uuid+"_"+bledev.localName,"sw_version": "1.0","model": bledev.localName,"manufacturer": "zesp"},
				"device_class": "humidity"
			};
		    mqttclient.publish(state_topic,pyload,{retain:true}, function() {});		
			}
		if (result.event['battery']){
		var pyload=result.event.battery+"";
		var state_topic=mqtt_topic+"/"+bledev.uuid+"/"+"ble"+"/"+"battery"+"/state";	
		var anons= {
				"name": "battery",//+"_"+bledev.uuid,
				"state_topic": state_topic,
				"unique_id": bledev.uuid+"battery",
				"device": {"identifiers": [bledev.localName+bledev.uuid],"name": bledev.uuid+"_"+bledev.localName,"sw_version": "1.0","model": bledev.localName,"manufacturer": "zesp"},
				"device_class": "battery"
			    };
		mqttclient.publish(state_topic,pyload,{retain:false}, function() {});		
			 }
	    }catch(e){console.log(e)}
	
  }catch{val=0}
 ///////// noble.stopScanning();
  /////////////////////////////////console.log('Stop scanning!');
/*
  
    //if (peripheral.id === peripheralIdOrAddress || peripheral.address === peripheralIdOrAddress) {
    noble.stopScanning();
    console.log('Stop scannong!');
    var advertisement = peripheral.advertisement;
    var localName = advertisement.localName;
    var txPowerLevel = advertisement.txPowerLevel;
    var manufacturerData = advertisement.manufacturerData;
    var serviceData = advertisement.serviceData;
    var serviceUuids = advertisement.serviceUuids;
    explore(peripheral);
  } */
}
);

/////
// stop scanning
///noble.stopScanning();
///console.log('Stop scannong!');
/////
//*************************************************************************************************************************** 
class miParser {
  constructor(buffer, bindKey = null) {
    this.baseByteLength = 5;
    if (buffer == null) {
      throw new Error("A buffer must be provided.");
    }
    this.buffer = buffer;
    if (buffer.length < this.baseByteLength) {
      throw new Error(
        `Service data length must be >= 5 bytes. ${this.toString()}`
      );
    }
    this.bindKey = bindKey;
  }

  parse() {
    this.frameControl = this.parseFrameControl();
    this.version = this.parseVersion();
    this.productId = this.parseProductId();
    this.frameCounter = this.parseFrameCounter();
    this.macAddress = this.parseMacAddress();
    this.capabilities = this.parseCapabilities();

    if (this.frameControl.isEncrypted) {
      this.decryptPayload();
    }

    this.eventType = this.parseEventType();
    this.eventLength = this.parseEventLength();
    this.event = this.parseEventData();
    return {
      frameControl: this.frameControl,
      event: this.event,
      productId: this.productId,
      frameCounter: this.frameCounter,
      macAddress: this.macAddress,
      eventType: this.eventType,
      capabilities: this.capabilities,
      eventLength: this.eventLength,
      version: this.version
    };
  }

  parseFrameControl() {
    const frameControl = this.buffer.readUInt16LE(0);
    return Object.keys(FrameControlFlags).reduce((map, flag) => {
      map[flag] = (frameControl & FrameControlFlags[flag]) !== 0;
      return map;
    }, {});
  }

  parseVersion() {
    return this.buffer.readUInt8(1) >> 4;
  }

  parseProductId() {
    return this.buffer.readUInt16LE(2);
  }

  parseFrameCounter() {return this.buffer.readUInt8(4);}
  parseMacAddress() {
    if (!this.frameControl.hasMacAddress) {
      return null;
    }
    const macBuffer = this.buffer.slice(
      this.baseByteLength,
      this.baseByteLength + 6
    );
    return Buffer.from(macBuffer)
      .reverse()
      .toString("hex");
  }

  get capabilityOffset() {
    if (!this.frameControl.hasMacAddress) {
      return this.baseByteLength;
    }
    return 11;
  }

  parseCapabilities() {
    if (!this.frameControl.hasCapabilities) {
      return null;
    }
    const capabilities = this.buffer.readUInt8(this.capabilityOffset);
    return Object.keys(CapabilityFlags).reduce((map, flag) => {
      map[flag] = (capabilities & CapabilityFlags[flag]) !== 0;
      return map;
    }, {});
  }

  get eventOffset() {
    let offset = this.baseByteLength;
    if (this.frameControl.hasMacAddress) {
      offset = 11;
    }
    if (this.frameControl.hasCapabilities) {
      offset += 1;
    }

    return offset;
  }

  parseEventType() {
    if (!this.frameControl.hasEvent) {
      return null;
    }
    return this.buffer.readUInt16LE(this.eventOffset);
  }

  parseEventLength() {
    if (!this.frameControl.hasEvent) {
      return null;
    }
    return this.buffer.readUInt8(this.eventOffset + 2);
  }

  decryptPayload() {
    const msgLength = this.buffer.length;
    const eventLength = msgLength - this.eventOffset;

    if (eventLength < 3) {
      return;
    }
    if (this.bindKey == null) {
      throw Error("Sensor data is encrypted. Please configure a bindKey.");
    }

    const encryptedPayload = this.buffer.slice(this.eventOffset, msgLength);

    const nonce = Buffer.concat([
      this.buffer.slice(5, 11), //mac_reversed
      this.buffer.slice(2, 4), //device_type
      this.buffer.slice(4, 5), //frame_cnt
      encryptedPayload.slice(-7, -4) //ext_cnt
    ]);

    const decipher = crypto.createDecipheriv(
      "aes-128-ccm",
      Buffer.from(this.bindKey, "hex"), //key
      nonce, //iv
      { authTagLength: 4 }
    );

    const ciphertext = encryptedPayload.slice(0, -7);

    decipher.setAuthTag(encryptedPayload.slice(-4));
    decipher.setAAD(Buffer.from("11", "hex"), {
      plaintextLength: ciphertext.length
    });

    const receivedPlaintext = decipher.update(ciphertext);

    decipher.final();

    this.buffer = Buffer.concat([
      this.buffer.slice(0, this.eventOffset),
      receivedPlaintext
    ]);
  }

  parseEventData() {
    if (!this.frameControl.hasEvent) {return null;}
    switch (this.eventType) {
      case EventTypes.temperature: {return this.parseTemperatureEvent();}
      case EventTypes.humidity: {return this.parseHumidityEvent();}
      case EventTypes.battery: {return this.parseBatteryEvent();}
      case EventTypes.temperatureAndHumidity: {return this.parseTemperatureAndHumidityEvent();}
      case EventTypes.fertility: {return this.parseFertilityEvent();}
      case EventTypes.moisture: {return this.parseMoistureEvent();}
      default: {
        throw new Error(
          `Unknown event type: ${this.eventType}. ${this.toString()}`
        );
      }
    }
  }

  parseTemperatureEvent() {return {temperature: this.buffer.readInt16LE(this.eventOffset + 3) / 10};}
  parseHumidityEvent()    {return {humidity: this.buffer.readUInt16LE(this.eventOffset + 3) / 10};}
  parseBatteryEvent() {return {battery: this.buffer.readUInt8(this.eventOffset + 3)};}
  parseTemperatureAndHumidityEvent() {
    const temperature = this.buffer.readInt16LE(this.eventOffset + 3) / 10;
    const humidity = this.buffer.readUInt16LE(this.eventOffset + 5) / 10;
    return { temperature, humidity };
  }

  parseIlluminanceEvent() {return {illuminance: this.buffer.readUIntLE(this.eventOffset + 3, 3)};}
  parseFertilityEvent() {return {fertility: this.buffer.readInt16LE(this.eventOffset + 3)};}
  parseMoistureEvent() {return {moisture: this.buffer.readInt8(this.eventOffset + 3)};}
  toString() {return this.buffer.toString("hex");}
 }