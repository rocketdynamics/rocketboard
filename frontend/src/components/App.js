import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Tabs, Alert } from 'antd';

import './App.css'
import "antd/dist/antd.css";

const TabPane = Tabs.TabPane;

class App extends Component {

  constructor(props) {
    super(props)
  }

  render() {
    return (
  <div className="App">
    <h1>Retrospective</h1>
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
