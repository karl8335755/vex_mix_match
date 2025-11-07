const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withKotlinVersion(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults || [];
    
    // Remove existing kotlin.version if present
    const existingIndex = config.modResults.findIndex(
      (item) => item.type === 'property' && item.key === 'kotlin.version'
    );
    if (existingIndex !== -1) {
      config.modResults.splice(existingIndex, 1);
    }
    
    // Add Kotlin version override
    config.modResults.push({
      type: 'property',
      key: 'kotlin.version',
      value: '1.9.25',
    });
    
    return config;
  });
};
