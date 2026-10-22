const defaults = { shields: 50, speed: 5, cloak: false };
const custom = { shields: 90 };

// Start from the defaults, then apply the custom settings
const settings = { ...custom, ...defaults };

console.log(`Shields: ${settings.shields}`);
