/**
 * Validates that non of the object properties are undefined
 *
 * @param {Object} obj - Object containing required values
 * @example
 * required({name: 'John', occupation: undefined})
 */
const required = (obj) => {
  const errors = [];

  Object.keys(obj).map((key) => {
    if (!obj[key]) errors.push(key);
  });

  if (errors.length > 0) {
    throw new Error(
      `The following fields are required and can not be undefined: ${errors.join(", ")}`,
    );
  }
};

module.exports = required;
