'use strict'
/* eslint-env node, mocha */

const { expect } = require('chai')
const { required } = require('../index')

describe('Require', () => {
  it('should not throw a Error when properties are defined', () => {
    let error

    try {
      required({name: 'John', occupation: 'Painter'})
    } catch (err) {
      error = err
    }

    expect(error).to.be.undefined
  })

  it('should throw a Error when properties are undefined', () => {
    let error

    try {
      required({name: 'John', occupation: undefined})
    } catch (err) {
      error = err
    }

    expect(error).to.not.be.undefined
  })
})
