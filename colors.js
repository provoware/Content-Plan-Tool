(function(global){
  function hexToRgb(hex) {
    const h = hex.replace('#','');
    const n = parseInt(h,16);
    return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
  }
  function hexToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  global.hexToRgb = hexToRgb;
  global.hexToRgba = hexToRgba;
  if (typeof module !== 'undefined') {
    module.exports = { hexToRgb, hexToRgba };
  }
})(typeof window !== 'undefined' ? window : globalThis);
