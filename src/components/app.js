import 'preact/debug'
import 'intersection-observer'
import '../request-idle-callback'
import whatInput from 'what-input'
import {h, Component} from 'preact'
import {css, cx, injectGlobal} from 'emotion'
import content from '../../content/index.js'
import Router, {route}  from 'preact-router'
import Match from 'preact-router/match'
import {debounce} from 'lodash'
import utils from '../utils'

// TweenLite has to be loaded in /src/template.html
const TweenLite = window.TweenLite

import DelayUnmount from './DelayUnmount'
import Splash from './Splash'
import Header from './Header'
import Song from './Song'
import ArrowCursor from './ArrowCursor'
import LinerNotes from './LinerNotes'
import KeyboardListener from './KeyboardListener'

export default class App extends Component {
    constructor(props) {
        super(props)
        this.state = {
            songs: content.songs,
            currentSong: null,
            initialRender: true,
            playBackgrounds: true,
            allowScroll: true,
            splashActive: false,
            showArrowCursor: false
        }
        this.cacheInnerHeight()
    }

    freezeScroll() {
        document.documentElement.style['overflow-y'] = 'hidden'
    }

    allowScroll() {
        document.documentElement.style['overflow-y'] = ''
    }

    componentDidMount() {
        const bigScreen = window.matchMedia('screen and (min-width: 600px)').matches
        if (bigScreen && document.scrollingElement.scrollTop === 0) {
            this.setState({
                splashActive: true
            })
        }
        window.addEventListener('resize', debounce(this.cacheInnerHeight, 300))
    }

    cacheInnerHeight = () => {
        // Save 1% the innerHeight to get the initial innerHeight on mobile browsers
        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    handleRoute = (e) => {
        console.log('🚀 handleRoute called:', {
            url: e.url,
            currentSong: this.state.currentSong ? this.state.currentSong.slug : null,
            state: this.state
        })

        if (e.url === '/') {
            console.log('📍 Route: Home - clearing currentSong')
            this.setState({
                currentSong: null,
                // handleRoute never gets called on the first render,
                // so splash should never be active here
                splashActive: false
            })
        } else if (e.url === '/end-credits') {
            console.log('📍 Route: End credits - redirecting to home')
            route('/', true)
            setTimeout(() => {
                this.scrollToElement(document.querySelector('.LinerNotes'))
            }, 500)
        } else {
            // Extract songSlug from URL
            const urlPath = e.url || ''
            const songSlug = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath
            console.log('📍 Route: Song page', { urlPath, songSlug })
            
            const matchingSong = this.state.songs.find(song => song.slug === songSlug)
            console.log('🎵 Found matching song:', matchingSong ? matchingSong.title : 'NOT FOUND')
            
            if (matchingSong && matchingSong !== this.state.currentSong) {
                console.log('✅ Setting new currentSong:', matchingSong.title)
                // Set the new song (or switch from another song)
                this.setState({
                    currentSong: matchingSong,
                    splashActive: false
                }, () => {
                    console.log('✅ setState callback - currentSong is now:', this.state.currentSong.title)
                })
                
                // Try to scroll to the song element, but don't break if it fails
                try {
                    const songElement = document.querySelector(`.Song#${matchingSong.slug}`)
                    console.log('🎯 Song element found:', !!songElement)
                    if (songElement) {
                        this.scrollToElement(songElement)
                    }
                } catch (error) {
                    console.warn('Scroll to element failed:', error)
                }
            } else if (matchingSong === this.state.currentSong) {
                console.log('⚠️ Same song already open, no action needed')
            } else {
                console.log('❌ No matching song found for slug:', songSlug)
            }
        }
    }

    // Reusable method to scroll to an element at a constant speed
    scrollToElement(element, onComplete, pixelsPerSec = 1500, maxDuration = 2) {
        if (!element || !document.scrollingElement) {
            if (onComplete) onComplete()
            return
        }
        
        try {
            const currentScroll = document.scrollingElement.scrollTop
            const targetScroll = utils.offset(element).top
            const delta = Math.abs(targetScroll - currentScroll)
            const duration = Math.min(delta / pixelsPerSec, maxDuration)

            if (window.TweenLite) {
                TweenLite.to(document.scrollingElement, duration, {
                    scrollTop: targetScroll,
                    ease: window.Sine ? window.Sine.easeInOut : 'power2.inOut',
                    onComplete: onComplete
                })
            } else {
                // Fallback if TweenLite is not available
                document.scrollingElement.scrollTop = targetScroll
                if (onComplete) onComplete()
            }
        } catch (error) {
            console.warn('ScrollToElement error:', error)
            if (onComplete) onComplete()
        }
    }

    enterNearestSong() {
        const songSections = Array.from(document.querySelectorAll('div.songs > .Song'))
        const scrollTop = document.scrollingElement.scrollTop
        const offsetTops = songSections.map(section => utils.offset(section).top)
        const nearestSong = songSections[utils.nearestNumber(offsetTops, scrollTop)]
        route(`/${nearestSong.getAttribute('id')}`)
    }

    scrollToSection = (target, duration = 0.4) => {
        if (target === 'next') {
            // Get array of all sections except Header
            const sections = Array.from(document.querySelectorAll('div.songs > .Song, .LinerNotes'))
            // cache scrollTop (causes reflow)
            const scrollTop = document.scrollingElement.scrollTop
            target = sections.find(section => {
                return utils.offset(section).top - 1 > scrollTop
            })
        } else if (target === 'prev') {
            // Get array of all sections
            const sections = Array.from(document.querySelectorAll('.Splash, .Header, div.songs > .Song, .LinerNotes'))
            // cache scrollTop (causes reflow)
            const scrollTop = document.scrollingElement.scrollTop
            target = sections.reverse().find(section => {
                return utils.offset(section).top < scrollTop
            })
        } else if (target.slug) {
            // It's a song object, not a DOM node
            target = document.querySelector(`.Song#${target.slug}`)
        }

        if (target) {
            this.scrollToElement(target)
        }
    }

    onLoaderClick = () => {
        this.setState({
            splashActive: false
        }, () => {
            setTimeout(() => {
                this.scrollToElement(document.querySelector('.Song'), null, 1000)
            }, 200)
        })
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.currentSong !== prevState.currentSong) {
            // If we exited a song
            if (this.state.currentSong === null) {
                // Immediately scroll to the song we just exited
                const songElement = document.querySelector(`.Song#${prevState.currentSong.slug}`)
                const offsetTop = utils.offset(songElement).top
                const bigScreen = window.matchMedia('screen and (min-width: 600px)').matches

                if (bigScreen) {
                    document.scrollingElement.scrollTop = offsetTop
                } else {
                    // On small screens, center song vertically
                    document.scrollingElement.scrollTop = offsetTop - (window.innerHeight / 4)
                }
            }
        }

        if (this.state.splashActive !== prevState.splashActive) {
            if (window.matchMedia('screen and (min-width: 600px)').matches) {
                // Prevent scrolling when loader is active
                if (this.state.splashActive && document.scrollingElement.scrollTop === 0) {
                    this.freezeScroll()
                } else {
                    this.allowScroll()
                }
            }
        }
    }

    render() {
        const style = css`
            height: 100%;
            & .songs .Song:nth-child(${this.state.songs.length}) {
                border-bottom: none;
            }
            & .LinerNotes {
                transition: opacity 0.3s;
                animation: ${this.state.currentSong === this.state.songs[this.state.songs.length - 1] ? 'fade-out both 0.2s' : 'fade-in both 0.3s 0.3s' };
            }
        `

        const bigScreen = window.matchMedia('screen and (min-width: 600px)').matches

        return (
            <div class={cx('App', style)} ontouchstart={e => {return true}}>
                {this.state.currentSong === null && bigScreen &&
                    <Splash
                        onclick={this.onLoaderClick}
                        songs={this.state.songs}
                        onload={() => {
                            this.setState({
                                splashLoaded: true
                            })
                        }}
                    />
                }
                {this.state.currentSong === null && !bigScreen &&
                    <Header
                        songs={this.state.songs}
                    />
                }
                <div
                    class="songs"
                    ref={element => this.songsElement = element}
                    onmouseenter={() =>
                        this.setState({
                            showArrowCursor: true
                        })
                    }
                    onmouseleave={() =>
                        this.setState({
                            showArrowCursor: false
                        })
                    }
                >
                    {this.state.songs.map( (song, index) => (
                        <Song
                            song={song}
                            nextSong={index + 1 < this.state.songs.length ? this.state.songs[index + 1] : null}
                            index={index}
                            isOpen={song === this.state.currentSong}
                            isVisible={this.state.currentSong === null || song === this.state.currentSong}
                            onclick={this.state.currentSong ? null : () => route(`/${song.slug}`)}
                            pauseBackground={this.state.pauseBackgrounds}
                            showArrowCursor={this.state.showArrowCursor}
                            key={song.slug}
                        />
                    ))}
                    {bigScreen && this.state.currentSong === null &&
                        <ArrowCursor
                            visible={this.state.showArrowCursor}
                            direction={'right'}
                        />
                    }
                </div>
                {this.state.currentSong === null &&
                    <LinerNotes
                        color={'blue'}
                        accentColor={'pink'}
                        listenLinks={content.listenLinks}
                        socialLinks={content.socialLinks}
                        credits={content.credits}
                    />
                }
                <Router onChange={this.handleRoute}>
                    <div path="/:songSlug"></div>
                    <div default></div>
                </Router>
                {(this.state.splashLoaded || !this.state.splashActive) &&
                    <KeyboardListener
                        onUp={e => {
                            e.preventDefault()
                            if(this.state.currentSong === null) {
                                this.scrollToSection('prev')
                            } else {
                                const cycleAmount = this.state.songs.indexOf(this.state.currentSong) - 1
                                // First, animate home
                                route('/')
                                // Then, scroll to next project
                                setTimeout(() => {
                                    route(`/${utils.cycleArray(this.state.songs, cycleAmount )[0].slug}`, true)
                                }, 500)
                            }
                        }}
                        onDown={e => {
                            e.preventDefault()
                            if (this.state.splashActive) {
                                this.setState({
                                    splashActive: false
                                })
                                this.allowScroll()
                            }

                            if(this.state.currentSong === null) {
                                this.scrollToSection('next')
                            } else {
                                const cycleAmount = this.state.songs.indexOf(this.state.currentSong) + 1
                                // First, animate home
                                route('/')
                                // Then, scroll to next project
                                setTimeout(() => {
                                    route(`/${utils.cycleArray(this.state.songs, cycleAmount )[0].slug}`, true)
                                }, 500)
                            }
                        }}
                        onRight={e => {
                            if (this.state.currentSong === null) {
                                e.preventDefault()
                                this.enterNearestSong()
                            }
                        }}
                        onEsc={() => route('/')}
                    />
                }
            </div>
        )
    }
}
