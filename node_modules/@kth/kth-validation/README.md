# KTH Validation

Validation utils commonly used in KTH Node projects

## Example

```javascript

const { required } = require('@kth/kth-validation')

function aFunction(name, occupation) {
  required({name, occupation})

  // .. do magic things
}

// No errors
aFunction('John', 'Painter')

// Error is thrown
aFunction('John')

```


