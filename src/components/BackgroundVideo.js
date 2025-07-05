import {h, Component} from 'preact'
import {css, cx, keyframes} from 'emotion'
import '../request-idle-callback.js'

const scrollPoster = keyframes`
    0% {
        transform: translate3d(0,0,0);
    }
    to {
        transform: translate3d(-100%, 0, 0);
    }
`

export default class BackgroundVideo extends Component {
    componentDidMount() {
        this.ctx = this.canvas.getContext('2d')
        if (this.props.playbackRate) this.video.playbackRate = this.props.playbackRate
        this.video.addEventListener('loadeddata', this.onloadeddata)
        this.video.addEventListener('play', this.start)
        this.video.addEventListener('pause', this.stop)
        this.video.setAttribute('muted', true)
    }

    onloadeddata = () => {
        this.canvas.width = this.video.videoWidth
        this.canvas.height = this.video.videoHeight
    }

    componentWillUnmount() {
        this.stop()
        this.video.removeEventListener('loadeddata', this.onloadeddata)
        this.video.removeEventListener('play', this.start)
        this.video.removeEventListener('pause', this.stop)
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.loaded !== this.state.loaded
    }

    componentDidUpdate(prevProps) {
        if (this.props.play && !prevProps.play && this.video.paused) {
            this.video.play()
        } else if (!this.props.play && prevProps.play && !this.video.paused && this.video.readyState === 4) {
            this.video.pause()
        }
    }

    start = () => {
        requestIdleCallback(() => {
            if (this.video) this.paintFrame()
            if (!this.state.loaded) {
                this.setState({
                    loaded: true
                })
            }
        }, {timeout: 1000})
    }

    stop = () => {
        cancelAnimationFrame(this.RAF)
    }

    paintFrame = (timeStamp = 0) => {
        this.RAF = requestAnimationFrame(this.paintFrame)
        this.ctx.drawImage(this.video,0,0)
    }

    render() {
        const style = css`
            background: var(--song-color);
            top: 0;
            width: 100%;
            height: 100%;
            & div.poster {
                height: 100%;
                width: 100%;
                display: flex;
                background-image: url('assets/noise.png');
                background-size: auto 100%;
                image-rendering: auto;
                image-rendering: crisp-edges;
                image-rendering: pixelated;
                opacity: ${this.state.loaded ? 0 : 1};
                will-change: opacity;
                transition: opacity 0.5s;
                background-color: var(--song-color);
                & img {
                    position: relative;
                    height: 100%;
                    width: auto;
                    flex-shrink: 0;
                    image-rendering: auto;
                    image-rendering: crisp-edges;
                    image-rendering: pixelated;
                    will-change: transform;
                    animation-play-state: ${this.state.loaded ? 'paused' : 'playing'};
                    animation: ${scrollPoster} ${2 + (this.props.songIndex % 2)}s infinite both steps(100);
                }
            }
            & canvas {
                display: block;
                width: 100%;
                height: 100%;
                image-rendering: auto;
                image-rendering: crisp-edges;
                image-rendering: pixelated;
                top: 0;
                object-fit: cover;
            }
            & video {
                position: absolute;
                z-index: -2;
                display: block;
                top: 0;
                opacity: 0;
            }
        `

        return (
            <div class={cx('BackgroundVideo', style, this.state.loaded && 'loaded')}>
                <canvas
                    ref={canvas => this.canvas = canvas}
                ></canvas>
                <div class="poster">
                    <img src="assets/background-poster.png"/>
                    <img src="assets/background-poster.png"/>
                    <img src="assets/background-poster.png"/>
                </div>
                <video
                    ref={video => this.video = video}
                    src={this.props.src}
                    preload
                    autoplay
                    muted
                    loop
                    playsinline
                ></video>
            </div>
        )
    }
}
