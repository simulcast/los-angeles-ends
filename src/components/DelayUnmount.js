import { h, Component } from 'preact'

export default class DelayUnmount extends Component {
   constructor(props) {
        super(props)
        this.state = {
            shouldRender: this.props.mount
        }
   }

   componentDidUpdate(prevProps) {
        console.log('🔄 DelayUnmount updated:', {
            mount: { prev: prevProps.mount, current: this.props.mount },
            shouldRender: this.state.shouldRender,
            unmountDelay: this.props.unmountDelay,
            mountDelay: this.props.mountDelay
        })

        if (prevProps.mount && !this.props.mount) {
            console.log('📤 DelayUnmount: Starting unmount process')
            clearTimeout(this.timer)
            if (this.props.unmountDelay) {
                console.log(`📤 DelayUnmount: Waiting ${this.props.unmountDelay}ms before unmounting`)
                this.timer = setTimeout(() => {
                    console.log('📤 DelayUnmount: Setting shouldRender to false')
                    this.setState({
                        shouldRender: false
                    })
                }, this.props.unmountDelay)
            } else {
                console.log('📤 DelayUnmount: Immediately setting shouldRender to false')
                this.setState({ shouldRender: false })
            }
        } else if (!prevProps.mount && this.props.mount) {
            console.log('📥 DelayUnmount: Starting mount process')
            clearTimeout(this.timer)
            if (this.props.mountDelay) {
                console.log(`📥 DelayUnmount: Waiting ${this.props.mountDelay}ms before mounting`)
                this.timer = setTimeout(() => {
                    console.log('📥 DelayUnmount: Setting shouldRender to true')
                    this.setState({
                        shouldRender: true
                    })
                }, this.props.mountDelay)
            } else {
                console.log('📥 DelayUnmount: Immediately setting shouldRender to true')
                this.setState({ shouldRender: true })
            }
        }
   }

   componentWillUnmount() {
        clearTimeout(this.timer)
   }

    render() {
        return this.state.shouldRender ? this.props.children : null
    }
}
