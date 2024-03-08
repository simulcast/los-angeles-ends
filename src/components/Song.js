import {h, Component} from 'preact'
import {css, cx} from 'emotion'
import {route} from 'preact-router'
import Slide from './Slide'
import TitleSlide from './TitleSlide'
import QuoteSlide from './QuoteSlide'
import NarrationSlide from './NarrationSlide'
import LyricsSlide from './LyricsSlide'
import VideoSlide from './VideoSlide'
import EndSlide from './EndSlide'
import BackgroundVideo from './BackgroundVideo'
import Toolbar from './Toolbar'
import HomeButton from './HomeButton'
import ArrowCursor from './ArrowCursor'
import KeyboardListener from './KeyboardListener'
import Curtain from './Curtain'
import DelayUnmount from './DelayUnmount'

const arrowButtonStyle = css`
    position: absolute;
    top: 0;
    bottom: 70px;
    margin: auto 0;
    width: 50px;
    height: 50px;
    & svg {
        width: 100%;
        height: 100%;
        overflow: visible;
    }
    &.left {
        left: 20px;
        transform: rotate(180deg);
    }
    &.right {
        right: 20px;
    }
`

const ArrowButton = ({...props}) => (
    <button
        onclick={props.onclick}
        class={cx('ArrowButton', arrowButtonStyle, props.direction)}
    >
        <svg  viewBox="-4 -4 86 104" version="1.1">
            <polygon fill-rule="evenodd" points="82 50 0 100 1.16529009e-14 0" fill="var(--off-white)" stroke="transparent" stroke-width="4px" />
        </svg>
    </button>
)

export default class Song extends Component {
    constructor(props) {
        super(props)
        this.state.slides = [
            {
                type: 'title',
                title: this.props.song.title,
                layout: this.props.song.titleLayout,
                slug: this.props.song.slug
            },
            ...this.props.song.slides,
            {
                type: 'end',
                nextSong: this.props.nextSong
            }
        ]

        this.state.currentSlideIndex = 0
        this.state.playerState = 'playing'
        this.audioRef = null
    }

    renderSlide = (slide) => {
        const isCurrent = this.state.slides[this.state.currentSlideIndex] === slide

        if (slide.type === 'title') {
            return (
                <TitleSlide
                    {...slide}
                    songIsOpen={this.props.isOpen}
                    isCurrent={isCurrent}
                    playerState={this.state.playerState}
                    songUrl={`/${this.props.song.slug}`}
                />
            )
        } else if (slide.type === 'quote') {
            return (
                <Slide>
                    <QuoteSlide
                        slide={slide}
                        isCurrent={isCurrent}
                    />
                </Slide>
            )
        } else if (slide.type === 'narration') {
            return (
                <Slide>
                    <NarrationSlide
                        slide={slide}
                        isCurrent={isCurrent}
                    />
                </Slide>
            )
        } else if (slide.type === 'lyrics') {
            return (
                <Slide>
                    <LyricsSlide
                        slide={slide}
                        isCurrent={isCurrent}
                    />
                </Slide>
            )
        } else if (slide.type === 'video') {
            return (
                <Slide
                    isCurrent={isCurrent}
                >
                    <VideoSlide
                        slide={slide}
                        isCurrent={isCurrent}
                    />
                </Slide>
            )
        } else if (slide.type === 'end') {
            return (
                <Slide>
                    <EndSlide
                        slide={slide}
                        isCurrent={isCurrent}
                        nextSong={this.props.nextSong}
                    />
                </Slide>
            )
        }
    }

    onVisibilityChange = (entries, observer) => {
        this.setState({
            playBackground: entries[0].intersectionRatio > 0
        })
    }

    componentDidMount() {
        window.addEventListener('hashchange', this.onhashchange)

        // Play or pause the video when it enters or leaves the viewport
        this.observer = new IntersectionObserver(this.onVisibilityChange, {
            threshold: [0, 0.25, 0.5, 0.75, 1]
        })
        this.observer.observe(this.element)

        this.audioRef.addEventListener('timeupdate', this.onAudioTimeUpdate)
        this.audioRef.addEventListener('ended', this.onAudioEnded)
        this.audioRef.addEventListener('play', this.onAudioPlay)
        this.audioRef.addEventListener('pause', this.onAudioPause)
    }

    onAudioTimeUpdate = () => {
        const duration = this.audioRef.duration
        const currentTime = this.audioRef.currentTime
        const progress = currentTime / duration

        this.setState({
            playerProgress: progress
        })
    }

    onAudioEnded = () => {
        this.audioRef.currentTime = 0
        this.audioRef.play()
    }

    onPlayButtonClick = () => {
        if (this.state.playerState === 'paused') {
            this.audioRef.play()
            this.setState({playerState: 'playing'})
        } else if (this.state.playerState === 'playing') {
            this.audioRef.pause()
            this.setState({playerState: 'paused'})
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.isOpen !== prevProps.isOpen) {
            if (this.audioRef) {
                if (this.props.isOpen) {
                    this.audioRef.play().then(() => {
                        const hashIndex = this.indexFromHash()
                        // After song starts playing, either jump to the index in the url,
                        // or to the first content slide
                        setTimeout(() => {
                            if (this.state.currentSlideIndex === 0) {
                                this.setState({
                                    currentSlideIndex: hashIndex || 1
                                })
                            }
                        }, 800)
                    }).catch(() => {
                        // If song does not play
                        // (this happens if there has been no user interaction)
                        window.addEventListener('click', () => {
                            this.audioRef.play()
                        }, {once: true})
                        window.addEventListener('touchstart', () => {
                            this.audioRef.play()
                        }, {once: true})
                    })
                } else {
                    this.audioRef.pause()
                }
            }
            if (this.state.currentSlideIndex !== prevState.currentSlideIndex && this.props.isOpen) {
                this.onhashchange()
            }
        }

        if (!this.props.isOpen && prevProps.isOpen) {
            this.setState({
                currentSlideIndex: 0
            })
        }

        if (this.state.currentSlideIndex !== prevState.currentSlideIndex) {
            this.element.querySelectorAll(`.Slide`)[this.state.currentSlideIndex].scrollTop = 0
        }

        if (this.props.pauseBackground !== prevProps.pauseBackground) {
            this.setState({
                pauseBackground: this.props.pauseBackground
            })
        }
    }

    componentWillUnmount() {
        if (this.audioRef) {
            this.audioRef.pause()
            this.audioRef.removeEventListener('timeupdate', this.onAudioTimeUpdate)
            this.audioRef.removeEventListener('ended', this.onAudioEnded)
        }
        if (this.observer) this.observer.disconnect()
        window.removeEventListener('hashchange', this.onhashchange)
    }

    indexFromHash() {
        const index = Number(window.location.hash.substring(1))
        if (index !== NaN && index <= this.state.slides.length - 1) {
            return index
        } else {
            return null
        }
    }

    onhashchange = () => {
        const index = this.indexFromHash()
        if (index) {
            this.setState({
                currentSlideIndex: index
            })
        }
    }

    onclick = e => {
        if (this.props.onclick) this.props.onclick()
        if (this.props.isOpen && e.target.tagName !== 'A' && e.target.parentNode.tagName !== 'A') {
            e.pageX < window.innerWidth / 2 ? this.prevSlide() : this.nextSlide()
        }
    }

    ontouchstart = e => {
        this.lastTouchStart = {
            x: e.changedTouches[0].screenX,
            y: e.changedTouches[0].screenY,
            wasTriggered: false
        }
    }

    ontouchmove = e => {
        // if we have already transitioned slides while this finger has been down, ignore
        if (this.lastTouchStart.wasTriggered) return

        const start = this.lastTouchStart

        const end = {
            x: e.changedTouches[0].screenX,
            y: e.changedTouches[0].screenY
        }

        if (Math.abs(end.y - start.y) > 10) return

        // if swiped left
        if (end.x < start.x) {
            if (start.x - end.x > 10) {
                this.nextSlide()
                this.lastTouchStart.wasTriggered = true
            }
        } else {
            if (end.x - start.x > 10) {
                this.prevSlide()
                this.lastTouchStart.wasTriggered = true
            }
        }
    }

    setCurrentSlide = (index) => {
        this.setState({
            currentSlideIndex: index
        }, () => {
            this.setHash()
        })
    }

    prevSlide = () => {
        const prevIndex = this.state.currentSlideIndex - 1
        if (prevIndex < 0) {
            route('/')
        } else {
            this.setState({
                currentSlideIndex: prevIndex < 0 ? this.state.slides.length - 1 : prevIndex
            }, this.setHash)
        }
    }

    nextSlide = () => {
        const nextIndex = (this.state.currentSlideIndex + 1) % (this.state.slides.length)
        this.setState({
            currentSlideIndex: nextIndex
        }, this.setHash)
    }

    setHash = () => {
        if (this.state.currentSlideIndex === 0) {
            history.replaceState(null, null, `/${this.props.song.slug}`)
        } else {
            history.replaceState(null, null, `/${this.props.song.slug}#${this.state.currentSlideIndex}`)
        }
    }

    render() {
        const style = css`
            display: ${this.props.isVisible ? 'block' : 'none'};
            --song-color: var(--${this.props.song.color});
            background: var(--song-color);
            height: ${this.props.isOpen ? '100vh' : '100vw' };
            height: ${this.props.isOpen ? 'calc(100 * var(--vh))' : '100vw' };
            overflow: hidden;
            position: relative;
            width: 100vw;
            color: var(--off-white);
            & .slider {
                display: flex;
                position: absolute;
                height: ${this.props.isOpen ? 'calc(100% - 60px)' : '100%'};
                width: ${this.state.slides.length * 100}vw;
                top: ${this.props.isOpen ? '60px' : 0};
                transform: translateX(-${this.props.isOpen ? this.state.currentSlideIndex * 100 : 0}vw);
                transition: transform 0.35s cubic-bezier(.23,.23,.36,.95);
                overflow: hidden;
                cursor: none;
                user-select: none;
                @media screen and (min-width: 600px) {
                    height: calc(100vh - 70px);
                    transition: transform 0.4s cubic-bezier(.23,.23,.36,.95), top 0.2s cubic-bezier(.23,.23,.36,.95);
                    top: 0;
                }
            }
            & button.play-song {
                display: block;
                width: 170px;
                position: absolute;
                padding: 11px 0px 10px 2px;
                font-size: 20px;
                text-align: center;
                letter-spacing: 0.08em;
                background-color: var(--song-color);
                color: var(--off-white);
                & .tighter {
                    letter-spacing: -0.001em;
                }
                bottom: 86px;
                left: 0;
                right: 0;
                margin: 0 auto;
                cursor: pointer;
                z-index: 1;
                transition: transform 0.4s, opacity 0.1s;
                opacity: ${this.props.isOpen ? 0 : 1};
                transform: ${this.props.isOpen ? 'translateY(80px)' : 'translateY(0)'};
                &:hover {
                    color: var(--song-color);
                    background-image: repeating-radial-gradient(circle at -50% 200%,transparent,transparent 1px, var(--off-white) 1px, var(--off-white) 8px,transparent 8px);;
                }
            }
            @media screen and (min-width: 600px) {
                height: 100vh;
                box-sizing: border-box;
                & > .HomeButton {
                    position: absolute;
                    top: 30px;
                    left: 30px;
                    & svg {
                        fill: var(--off-white);
                    }
                    &:hover svg {
                        cursor: pointer;
                        fill: var(--song-color);
                    }
                }
            }
        `

        const bigScreen = window.matchMedia('screen and (min-width: 600px)').matches

        return (
            <section
                class={cx('Song', style, this.props.class)}
                id={this.props.song.slug}
                ref={element => this.element = element}
                key={this.props.song.slug}
            >
                <BackgroundVideo
                    src={this.props.song.backgroundVideo}
                    color={this.props.song.color}
                    play={this.state.playBackground && !this.props.pauseBackground}
                    playbackRate={this.props.song.backgroundPlaybackRate}
                    slug={this.props.song.slug}
                    songIndex={this.props.index}
                />
                <Toolbar
                    currentSlideIndex={this.state.currentSlideIndex}
                    isOpen={this.props.isOpen}
                    song={this.props.song}
                    slides={this.state.slides}
                    playerState={this.state.playerState}
                    playerProgress={this.state.playerProgress}
                    onPlayButtonClick={this.onPlayButtonClick}
                    onSegmentClick={this.setCurrentSlide}
                />
                {bigScreen && this.state.currentSlideIndex > 0 &&
                    <ArrowButton
                        direction={'left'}
                        onclick={e => {
                            e.stopPropagation()
                            this.prevSlide()
                        }}
                    />
                }
                {bigScreen &&
                    <ArrowButton
                        direction={'right'}
                        onclick={e => {
                            e.stopPropagation()
                            this.nextSlide()
                        }}
                    />
                }
                {bigScreen &&
                    <ArrowCursor
                        visible={this.props.isOpen && this.props.showArrowCursor && this.state.showArrowCursor}
                    />
                }
                <div
                    class="slider"
                    onclick={this.onclick}
                    ontouchstart={this.props.isOpen && this.ontouchstart}
                    ontouchmove={this.props.isOpen && this.ontouchmove}
                    ontouchend={this.props.isOpen && this.ontouchmove}
                    onmouseenter={() =>
                        this.setState({
                            showArrowCursor: true
                        })
                    }
                    onmouseleave={() =>
                        this.setState({
                            showArrowCursor: true
                        })
                    }
                >
                    {this.state.slides.map( slide => {
                        if (slide.type === 'title') {
                            return this.renderSlide(slide)
                        } else {
                            return (
                                <DelayUnmount
                                    unmountDelay={400}
                                    mount={this.props.isOpen}
                                >
                                    {this.renderSlide(slide)}
                                </DelayUnmount>
                            )
                        }
                    })}
                </div>
                {bigScreen &&
                    <button
                        class="play-song"
                        onclick={() => route(`/${this.props.song.slug}`)}
                    >
                        <span>S<span class="tighter">T</span>ART SONG</span>
                    </button>
                }
                {bigScreen && this.props.isOpen &&
                    <HomeButton
                        onclick={() => route('/')}
                    />
                }
                {bigScreen &&
                    <Curtain
                        side="top"
                        isOpen={this.props.isOpen}
                    />
                }
                {bigScreen &&
                    <Curtain
                        side="right"
                        isOpen={this.props.isOpen}
                    />
                }
                {bigScreen &&
                    <Curtain
                        side="bottom"
                        isOpen={this.props.isOpen}
                    />
                }
                {bigScreen &&
                    <Curtain
                        side="left"
                        isOpen={this.props.isOpen}
                    />
                }
                {this.props.isOpen &&
                    <KeyboardListener
                        onRight={this.nextSlide}
                        onLeft={this.prevSlide}
                        onEsc={() => route('/')}
                    />
                }
                <audio
                    ref={ref => this.audioRef = ref}
                    src={this.props.song.audioUrl}
                    preload="auto"
                />
            </section>
        )
    }
}
