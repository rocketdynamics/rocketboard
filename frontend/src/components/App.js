import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import RetroColumn from './RetroColumn';

import './App.css'
import "antd/dist/antd.css";

class App extends Component {

  constructor(props) {
    super(props)
  }

  render() {
    return (
  <div className="App">
    <h1>Retrospective</h1>

    <RetroColumn title="Actions" colour="Red" layout="vertical" cardWidth="200px"/>
    <div style={{display: "flex"}}>
      <RetroColumn title="Positive" colour="lime"/>
      <RetroColumn title="Mixed" colour="orange"/>
      <RetroColumn title="Negative" colour="maroon"/>
    </div>
  </div>
)
  }
}

const mapStateToProps = state => {
  // const { _ } = state
  return {
  }
}

App.propTypes = {
}


export default connect(mapStateToProps)(App)
