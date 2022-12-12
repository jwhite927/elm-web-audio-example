const defer = f => setTimeout(f, 0)
const AudioContext = window.AudioContext || window.webkitAudioContext

export class VirtualAudioContext {
    static prepare(graph = []) {
        const key = (graph, base = '') => {
            graph.forEach((node, i) => {
                if (node.type === 'RefNode') return
                if (!node.key) node.key = `${base}_${i}`
                if (node.connections && node.connections.length > 0) {
                    key(node.connections, node.key)
                }
            })

            return graph
        }

        const flatten = (graph, nodes = {}, depth = 0) => {
            graph.forEach((node, i) => {
                // Don't push RefNodes to the flat graph.
                if (node.type !== 'RefNode') nodes[node.key] = node
                if (node.connections) flatten(node.connections, nodes, depth + 1)
                // If we're deeper than the root of the graph, replace
                // this node with a reference to itself by key.
                if (depth > 0) graph[i] = { type: 'RefNode', key: node.key }
            })

            return nodes
        }

        return flatten(key(graph))
    }

    //
    static diff(oldNodes, newNodes) {
        const patches = { created: [], updated: [], removed: [] }

        for (const newNode of Object.values(newNodes)) {
            const oldNode = oldNodes[newNode.key]

            if (!oldNode) {
                patches.created.push({ type: 'node', key: newNode.key, data: newNode })

                newNode.connections.forEach(connection => {
                    patches.created.push({ type: 'connection', key: newNode.key, data: connection.key.split('.') })
                })

            } else if (oldNode.type !== newNode.type) {
                patches.updated.push({ type: 'node', key: newNode.key, data: newNode })

                newNode.connections.forEach(connection => {
                    patches.created.push({ type: 'connection', key: newNode.key, data: connection.key.split('.') })
                })

            } else {
                for (let j = 0; j < Math.max(oldNode.properties.length, newNode.properties.length); j++) {
                    const oldProp = oldNode.properties[j]
                    const newProp = newNode.properties[j]

                    //
                    if (!oldProp) {
                        patches.created.push({ type: 'property', key: oldNode.key, data: newProp })
                    } else if (!newProp) {
                        patches.removed.push({ type: 'property', key: oldNode.key, data: oldProp })
                    } else if (oldProp.label !== newProp.label) {
                        patches.removed.push({ type: 'property', key: oldNode.key, data: oldProp })
                        patches.created.push({ type: 'property', key: oldNode.key, data: newProp })
                    } else if (oldProp.value !== newProp.value) {
                        patches.updated.push({ type: 'property', key: oldNode.key, data: newProp })
                    }
                }

                for (let j = 0; j < Math.max(oldNode.connections.length, newNode.connections.length); j++) {
                    const oldConnection = oldNode.connections[j]
                    const newConnection = newNode.connections[j]

                    //
                    if (!oldConnection) {
                        patches.created.push({ type: 'connection', key: oldNode.key, data: newConnection.key.split('.') })
                    } else if (!newConnection) {
                        patches.removed.push({ type: 'connection', key: oldNode.key, data: oldConnection.key.split('.') })
                    } else if (oldConnection.key !== newConnection.key) {
                        patches.removed.push({ type: 'connection', key: oldNode.key, data: oldConnection.key.split('.') })
                        patches.created.push({ type: 'connection', key: oldNode.key, data: newConnection.key.split('.') })
                    }
                }
            }

            delete oldNodes[newNode.key]
        }

        for (const oldNode of Object.values(oldNodes)) {
            patches.removed.push({ type: 'node', key: oldNode.key, data: oldNode })
        }

        return patches
    }

    constructor(context = new AudioContext(), opts = {}) {
        this.$context = context
        this.$nodes = {}
        this.vPrev = {}
        if (opts.autostart) this.resume()
    }

    update(vGraph = []) {
        const vCurr = VirtualAudioContext.prepare(vGraph)

        const diff = VirtualAudioContext.diff(this.vPrev, vCurr)

        diff.removed.forEach(patch => {
            switch (patch.type) {
                case 'node':
                    this._destroyNode(patch.key)
                    break
                case 'property':
                    this._removeProperty(patch.key, patch.data)
                    break
                case 'connection':
                    this._disconnect(patch.key, patch.data)
                    break
            }
        })

        diff.created.forEach(patch => {
            switch (patch.type) {
                case 'node':
                    this._createNode(patch.key, patch.data)
                    break
                case 'property':
                    this._setProperty(patch.key, patch.data)
                    break
                case 'connection':
                    defer(() => this._connect(patch.key, patch.data))
                    break
            }
        })

        diff.updated.forEach(patch => {
            switch (patch.type) {
                case 'node':
                    this._destroyNode(patch.key)
                    this._createNode(patch.key, patch.data)
                    break
                case 'property':
                    this._setProperty(patch.key, patch.data)
                    break
                case 'connection':
                    // Connections can't be updated
                    break
            }
        })

        this.vPrev = vCurr
    }

    suspend() {
        this.$context.suspend()
    }

    resume() {
        this.$context.resume()
    }

    _createNode(key, { type, properties }) {
        let $node = null

        //
        switch (type) {
            case 'AnalyserNode':
                $node = this.$context.createAnalyser()
                break
            case 'AudioBufferSourceNode':
                $node = this.$context.createBufferSource()
                break
            case 'AudioDestinationNode':
                $node = this.$context.destination
                break
            case 'BiquadFilterNode':
                $node = this.$context.createBiquadFilter()
                break
            case 'ChannelMergerNode':
                $node = this.$context.createChannelMerger()
                break
            case 'ChannelSplitterNode':
                $node = this.$context.createChannelSplitter()
                break
            case 'ConstantSourceNode':
                $node = this.$context.createConstantSource()
                break
            case 'ConvolverNode':
                $node = this.$context.createConvolver()
                break
            case 'DelayNode':
                const maxDelayTime = properties.find(({ label }) => label === 'maxDelayTime')
                $node = this.$context.createDelay((maxDelayTime && maxDelayTime.value) || 1)
                break
            case 'DynamicsCompressorNode':
                $node = this.$context.createDynamicsCompressor()
                break
            case 'GainNode':
                $node = this.$context.createGain()
                break
            case 'IIRFilterNode':
                const feedforward = properties.find(({ label }) => label === 'feedforward')
                const feedback = properties.find(({ label }) => label === 'feedback')
                $node = this.$context.createIIRFilter(
                    (feedforward && feedforward.value) || [0],
                    (feedback && feedback.value) || [1]
                )
                break
            case 'MediaElementAudioSourceNode':
                const mediaElement = properties.find(({ label }) => label === 'mediaElement')
                $node = this.$context.createMediaElementSource(
                    document.querySelector(mediaElement.value)
                )
                break
            case 'MediaStreamAudioDestinationNode':
                $node = this.$context.createMediaStreamDestination()
                break
            case 'OscillatorNode':
                $node = this.$context.createOscillator()
                break
            case 'PannerNode':
                $node = this.$context.createPanner()
                break
            case 'StereoPannerNode':
                $node = this.$context.createStereoPanner()
                break
            case 'WaveShaperNode':
                $node = this.$context.createWaveShaper()
                break
            default:
                console.warn(`Invalide node type of: ${type}. Defaulting to GainNode to avoid crashing the AudioContext.`)
                $node = this.$context.createGain()
        }

        this.$nodes[key] = $node

        properties.forEach(prop => this._setProperty(key, prop))

        if ($node.start) $node.start()
    }

    _destroyNode(key) {
        const $node = this.$nodes[key]

        if ($node.stop) $node.stop()

        $node.disconnect()

        delete this.$nodes[key]
    }

    //
    _setProperty(key, { type, label, value }) {
        const $node = this.$nodes[key]

        switch (type) {
            case 'NodeProperty':
                $node[label] = value
                break
            case 'AudioParam':
                $node[label].linearRampToValueAtTime(value, this.$context.currentTime + 0.01)
                break
            case 'ScheduledUpdate':
                $node[label][value.method](value.target, value.time)
                break
        }
    }

    //
    _removeProperty(key, { type, label, value }) {
        const $node = this.$nodes[key]

        switch (type) {
            case 'NodeProperty':
                break
            case 'AudioParam':
                $node[label].value = $node[label].default
                break
            case 'ScheduledUpdate':
                // TODO: work out how to cancel scheduled updates
                break
        }
    }

    //
    _connect(a, [b, param = null]) {
        if (b) this.$nodes[a].connect(param ? this.$nodes[b][param] : this.$nodes[b])
    }

    //
    _disconnect(a, [b, param = null]) {
        if (b) this.$nodes[a].disconnect(param ? this.$nodes[b][param] : this.$nodes[b])
    }
}

