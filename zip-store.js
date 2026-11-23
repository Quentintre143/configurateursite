(function (global) {
  'use strict';
  var encoder = new TextEncoder();
  var table = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  function crc32(bytes) {
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function put16(view, offset, value) { view.setUint16(offset, value & 0xFFFF, true); }
  function put32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
  function dosDateTime(date) {
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }
  async function toBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (value && typeof value.arrayBuffer === 'function') return new Uint8Array(await value.arrayBuffer());
    return encoder.encode(String(value == null ? '' : value));
  }
  async function buildZip(entries) {
    if (!Array.isArray(entries) || entries.length > 65535) throw new Error('Liste de fichiers ZIP invalide.');
    var localParts = [], centralParts = [], localOffset = 0, count = 0;
    var now = dosDateTime(new Date());
    for (var entry of entries) {
      var name = String(entry.name || '').replace(/\\/g, '/');
      if (!name || name.startsWith('/') || name.split('/').some(function (part) { return part === '..' || part === ''; })) throw new Error('Chemin de fichier non autorisé dans le ZIP.');
      var nameBytes = encoder.encode(name);
      var data = await toBytes(entry.data);
      if (nameBytes.length > 65535 || data.length > 0xFFFFFFFF || localOffset > 0xFFFFFFFF) throw new Error('Un fichier dépasse la limite du format ZIP standard.');
      var crc = crc32(data);
      var local = new Uint8Array(30 + nameBytes.length);
      var lv = new DataView(local.buffer);
      put32(lv, 0, 0x04034B50); put16(lv, 4, 20); put16(lv, 6, 0x0800); put16(lv, 8, 0);
      put16(lv, 10, now.time); put16(lv, 12, now.date); put32(lv, 14, crc);
      put32(lv, 18, data.length); put32(lv, 22, data.length); put16(lv, 26, nameBytes.length); put16(lv, 28, 0);
      local.set(nameBytes, 30);
      localParts.push(local, data);

      var central = new Uint8Array(46 + nameBytes.length);
      var cv = new DataView(central.buffer);
      put32(cv, 0, 0x02014B50); put16(cv, 4, 20); put16(cv, 6, 20); put16(cv, 8, 0x0800); put16(cv, 10, 0);
      put16(cv, 12, now.time); put16(cv, 14, now.date); put32(cv, 16, crc);
      put32(cv, 20, data.length); put32(cv, 24, data.length); put16(cv, 28, nameBytes.length);
      put16(cv, 30, 0); put16(cv, 32, 0); put16(cv, 34, 0); put16(cv, 36, 0); put32(cv, 38, 0); put32(cv, 42, localOffset);
      central.set(nameBytes, 46);
      centralParts.push(central);
      localOffset += local.length + data.length;
      count++;
    }
    var centralSize = centralParts.reduce(function (sum, part) { return sum + part.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    put32(ev, 0, 0x06054B50); put16(ev, 4, 0); put16(ev, 6, 0); put16(ev, 8, count); put16(ev, 10, count);
    put32(ev, 12, centralSize); put32(ev, 16, localOffset); put16(ev, 20, 0);
    return new Blob(localParts.concat(centralParts, [end]), { type: 'application/zip' });
  }
  global.buildStaticZip = buildZip;
})(window);
