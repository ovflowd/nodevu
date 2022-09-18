const dns = require('node:dns')
const assert = require('node:assert')
const nodevu = require('../index')
const { MockAgent, setGlobalDispatcher } = require('undici')

// this fixes a bug in Node.js - it should be fixed _eventually_ and can be removed: https://github.com/nodejs/undici/issues/1248
dns.setDefaultResultOrder('ipv4first')

const staticIndex = require('./data/static/index.json')
const staticSchedule = require('./data/static/schedule.json')
const staticNow = require('./data/static/now.json')
const usableStaticNow = JSON.parse(staticNow)

// these are tests that run with static data but do not need to be frozen in time.
describe('check that we get the values we expect from values that should not ever change', async () => {
  beforeEach(() => {
    // this mock agent stuff isn't actually working for... some unkown reason
    const mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)

    const nodejsMock = mockAgent.get('https://nodejs.org')
    nodejsMock.intercept({ path: '/dist/index.json' }).reply(200, staticIndex)

    const githubMock = mockAgent.get('https://raw.githubusercontent.com')
    githubMock.intercept({ path: '/nodejs/Release/master/schedule.json' }).reply(200, staticSchedule)
  })

  it('should have some correct values for Node.js dependencies', async () => {
    const staticData = await nodevu()
    assert.deepStrictEqual(staticData.v17.releases['v17.0.0'].dependencies.npm, '8.1.0')
    assert.deepStrictEqual(staticData.v17.releases['v17.0.0'].dependencies.v8, '9.5.172.21')
    assert.deepStrictEqual(staticData.v17.releases['v17.0.0'].dependencies.uv, '1.42.0')
    assert.deepStrictEqual(staticData.v17.releases['v17.0.0'].dependencies.zlib, '1.2.11')
    assert.deepStrictEqual(staticData.v17.releases['v17.0.0'].dependencies.openssl, '3.0.0+quic')
  })

  it('should have some correct static values for support in a release line', async () => {
    const staticData = await nodevu()
    assert.deepStrictEqual(staticData.v14.support.codename, 'Fermium')
    assert.deepStrictEqual(staticData.v14.support.lts.newest, '14.19.0')
    assert.deepStrictEqual(staticData.v14.support.lts.oldest, '14.15.0')
    assert.deepStrictEqual(staticData.v14.support.phases.dates.start, '2020-04-21')
    assert.deepStrictEqual(staticData.v14.support.phases.dates.lts, '2020-10-27')
    assert.deepStrictEqual(staticData.v14.support.phases.dates.maintenance, '2021-10-19')
    assert.deepStrictEqual(staticData.v14.support.phases.dates.end, '2023-04-30')
  })
})

// this is a set of tests that only test against static data effectively frozen at a point in time.
// these tests should *probably* be updated sometimes. see the npm scripts for update scripts.
//
// of particular note about them, they use the `now` option in core to allow us to freeze the
// time that we're doing relative checks against.
//
// only tests that *require* the `now` option shoulod be in this set of tests.
describe('statically check that we get dynamic values correctly', async () => {
  beforeEach(() => {
    // this mock agent stuff isn't actually working for... some unkown reason
    const mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)

    const nodejsMock = mockAgent.get('https://nodejs.org')
    nodejsMock.intercept({ path: '/dist/index.json' }).reply(200, staticIndex)

    const githubMock = mockAgent.get('https://raw.githubusercontent.com')
    githubMock.intercept({ path: '/nodejs/Release/master/schedule.json' }).reply(200, staticSchedule)
  })

  it('should have some correct dynamic values for support in a release line', async () => {
    const staticData = await nodevu({ now: usableStaticNow })
    assert.deepStrictEqual(staticData.v8.support.phases.current, 'end')
    assert.deepStrictEqual(staticData.v14.support.phases.current, 'maintenance')
    assert.deepStrictEqual(staticData.v16.support.phases.current, 'lts')
    assert.deepStrictEqual(staticData.v17.support.phases.current, 'start')
  })
})
