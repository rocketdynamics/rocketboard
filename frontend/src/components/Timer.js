import React from "react";

class Timer extends React.Component {
    timer = null;
    state = {
        duration: this.props.getDuration(),
    };

    componentDidMount = () => {
        this.timer = setInterval(() => {
            this.setState({ duration: this.props.getDuration() });
        }, 1000);
    };

    componentWillUnmount = () => {
        clearInterval(this.timer);
    };

    getHumanisedDuration = ms => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds - minutes * 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
            2,
            "0"
        )}`;
    };

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.duration !== this.state.duration;
    }

    render() {
        return (
            <React.Fragment>
                {this.getHumanisedDuration(this.state.duration)}
            </React.Fragment>
        );
    }
}

export default Timer;
