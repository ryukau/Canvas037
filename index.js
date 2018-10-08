class Path {
  // density は [0, 1]。 1 のとき隙間なく埋める。
  // yRange が 0 のとき直線が描かれる。 1 のときは最大の高さが canvas.height になる。
  // yCenter は [0, 1]。 画面の高さの割合を表す。
  constructor(canvas, density, yCenter, yRange, scrollSpeed) {
    this.canvas = canvas
    this.density = density
    this.yCenter = yCenter
    this.yRange = yRange
    this.scrollSpeed = Math.max(0, scrollSpeed)
    this.path = new Array(Math.floor(canvas.width * density) + 1)
    this.maxJitter = Math.floor(canvas.width / this.path.length)

    this.path[0] = new Vec2(0, this.createY())
    for (var i = 1; i < this.path.length; ++i) {
      this.path[i] = new Vec2((i + randRange(0.4, 1)) * this.maxJitter, this.createY())
    }
    this.addPoint()
  }

  addPoint() {
    this.path.push(new Vec2(
      canvas.width + randRange(0.4, 1) * this.maxJitter,
      this.createY()
    ))
  }

  createY() {
    return this.canvas.height * this.yCenter * (1 + this.yRange * randRange(-1, 1))
  }

  draw(canvas) {
    canvas.context.strokeStyle = "#00000044"
    canvas.context.lineWidth = 1
    canvas.drawPath(this.path)

    // move
    for (let p of this.path) {
      p.x += -this.scrollSpeed
    }

    if (this.path[1].x < 0) {
      this.path.shift()
    }

    if (this.path[this.path.length - 1].x < canvas.width) {
      this.addPoint()
    }
  }
}

class Lightning {
  constructor(audio, paths) {
    this.lifespan = 4000 * randRange(0.5, 1.5)
    this.timeToTerminate = Date.now() + this.lifespan

    this.path = new Array(paths.length).fill(0)
    this.pathIndices = new Array(paths.length)

    var pathIndex = Math.floor(paths[0].path.length * randRange(0.3, 0.7))
    for (var i = 0; i < paths.length; ++i) {
      var rand = Math.random()
      if (rand < 0.04) {
        if (rand < 0.02) {
          ++pathIndex
        } else {
          --pathIndex
        }
      }
      this.pathIndices[i] = clamp(pathIndex, 0, paths[i].path.length - 1)
    }

    this.gain = []

    var lifespanSec = this.lifespan * 0.001

    this.lowpass = audio.context.createBiquadFilter()
    this.lowpass.type = "lowpass"
    this.lowpass.frequency.value = randRange(1000, 1200)
    this.lowpass.Q.value = this.lifespan / 4000 * 4
    this.lowpass.connect(audio.master)

    this.highpass = audio.context.createBiquadFilter()
    this.highpass.type = "highpass"
    this.highpass.frequency.value = randRange(30, 800)
    this.highpass.Q.value = this.lifespan / 4000
    this.highpass.connect(this.lowpass)

    this.panner = audio.context.createStereoPanner()
    var mid = Math.floor(paths.length / 2)
    var x = paths[mid].path[this.pathIndices[mid]].x
    var width = paths[mid].canvas.width
    this.panner.pan.value = (x / width - 0.5) * 2
    this.panner.connect(this.highpass)

    this.gain.push(audio.context.createGain())
    this.gain[0].gain.value = 1e-6
    this.gain[0].gain.exponentialRampToValueAtTime(randRange(0.005, 0.015),
      audio.context.currentTime + lifespanSec * 0.02)
    this.gain[0].gain.exponentialRampToValueAtTime(1e-4,
      audio.context.currentTime + this.lifespan * 1e-3)
    this.gain[0].connect(this.panner)

    this.osc = []

    this.osc.push(audio.context.createOscillator())
    this.osc[0].type = "sine"
    this.osc[0].frequency.value = 60
    this.osc[0].detune.value = randRange(-1200, 1200)
    this.osc[0].connect(this.gain[0])
    this.osc[0].start()

    this.gain.push(audio.context.createGain())
    this.gain[1].gain.value = 1000
    this.gain[1].connect(this.osc[0].frequency)

    this.osc.push(audio.context.createOscillator())
    this.osc[1].type = "sine"
    this.osc[1].frequency.value = randRange(100, 300)
    this.osc[1].detune.value = 0
    this.osc[1].connect(this.gain[1])
    this.osc[1].start()

    this.osc.push(audio.context.createOscillator())
    this.osc[2].type = "sine"
    this.osc[2].frequency.value = randRange(2000, 4000)
    this.osc[2].detune.value = 0
    this.osc[2].connect(this.gain[1])
    this.osc[2].start()

    this.osc.push(audio.context.createOscillator())
    this.osc[3].type = "sine"
    this.osc[3].frequency.value = randRange(10000, 20000)
    this.osc[3].detune.value = 0
    this.osc[3].connect(this.gain[1])
    this.osc[3].start()

    this.osc.push(audio.context.createOscillator())
    this.osc[4].type = "sine"
    this.osc[4].frequency.value = randRange(1000, 3000)
    this.osc[4].detune.value = 0
    this.osc[4].connect(this.gain[1])
    this.osc[4].start()

    this.osc.push(audio.context.createOscillator())
    this.osc[5].type = "sine"
    this.osc[5].frequency.value = randRange(10, 20)
    this.osc[5].detune.value = 0
    this.osc[5].connect(this.gain[1])
    this.osc[5].start()

    this.osc.push(audio.context.createOscillator())
    this.osc[6].type = "sine"
    this.osc[6].frequency.value = randRange(10, 20)
    this.osc[6].detune.value = 0
    this.osc[6].connect(this.gain[1])
    this.osc[6].start()
  }

  stopOscillator() {
    for (var i = 0; i < this.osc.length; ++i)
      this.osc[i].stop()

    for (var i = 0; i < this.gain.length; ++i)
      this.gain[i].disconnect()
  }

  draw(canvas, paths, now) {
    var alpha = (this.timeToTerminate - now) / this.lifespan
    var color = `rgba(230, 240, 255, ${alpha})`
    canvas.context.strokeStyle = color
    canvas.context.lineWidth = 0.3
    canvas.context.lineJoin = "bevel"

    // canvas.context.shadowColor = color
    // canvas.context.shadowBlur = 2

    for (var i = 0; i < paths.length; ++i) {
      var index = clamp(this.pathIndices[i], 0, paths[i].path.length - 1)
      this.path[i] = paths[i].path[index]
    }
    canvas.drawPath(this.path)

    // canvas.context.shadowBlur = 0
  }
}

function randRange(min, max) {
  return (max - min) * Math.random() + min
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max))
}

function draw(canvas) {
  var now = Date.now()

  for (let path of paths) {
    path.draw(canvas)
  }

  if (Math.random() < 0.003) {
    lightnings.push(new Lightning(audio, paths))
  }

  if (lightnings.length > 0 && lightnings[0].timeToTerminate < now) {
    var lit = lightnings.shift()
    lit.stopOscillator()
  }

  for (let lit of lightnings) {
    lit.draw(canvas, paths, now)
  }
}

function refresh() {
  canvas.clearWhite()
  draw(canvas)
}

function animate() {
  refresh()
  requestAnimationFrame(animate)
}

class Audio {
  constructor() {
    this.context = new AudioContext()

    this.master = this.context.createGain()
    this.master.gain.value = 1
    this.master.connect(this.context.destination)

    this.f2 = this.context.createBiquadFilter()
    this.f2.type = "lowpass"
    this.f2.frequency.value = 1000
    this.f2.Q.value = 0.001
    this.f2.connect(this.master)

    this.f1 = this.context.createBiquadFilter()
    this.f1.type = "highpass"
    this.f1.frequency.value = 400
    this.f1.Q.value = 1
    this.f1.connect(this.f2)
  }
}

class Oscillator {
  constructor(audio, gain, frequency) {
    this.context = audio.context

    this.panner = this.context.createStereoPanner()
    this.panner.connect(audio.f1)

    this.lfoPan = this.context.createOscillator()
    this.lfoPan.type = "sine"
    this.lfoPan.frequency.value = frequency * 0.01
    this.lfoPan.detune.value = 0
    this.lfoPan.connect(this.panner.pan)
    this.lfoPan.start()

    this.gain = this.context.createGain()
    this.gain.gain.value = gain
    this.gain.connect(this.panner)

    this.oscillator = this.context.createOscillator()
    this.oscillator.type = "sawtooth"
    this.oscillator.frequency.value = frequency
    this.oscillator.detune.value = 0
    this.oscillator.connect(this.gain)
    this.oscillator.start()
  }
}

// Entry point.
var audio = new Audio()
console.log(audio.context)

var osc = new Array(128)
for (var i = 0; i < osc.length; ++i) {
  osc[i] = new Oscillator(
    audio,
    (Math.random() * 0.9 + 0.1) / osc.length,
    Math.random() * osc.length
  )
}

var canvas = new Canvas(document.body, 512, 512)
var paths = new Array(1024)
var lightnings = []

for (var i = 0; i < paths.length; ++i) {
  var ratio = i / paths.length
  paths[i] = new Path(
    canvas,
    0.03,
    0.0 + 1.0 * ratio,
    0.01 + 0.04 * ratio,
    0.1 + 1.4 * ratio
  )
}

animate()

// If startup is succeeded, remove "unsupported" paragaraph.
document.getElementById("unsupported").outerHTML = ""
