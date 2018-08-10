import React, { Component } from 'react'
import PropTypes from 'prop-types'
import RetroColumn from './RetroColumn';
import { DragDropContext } from 'react-beautiful-dnd';

import './App.css'
import "antd/dist/antd.css";

class App extends Component {
  render() {
    return (
  <div className="App">
    <h1>Retrospective</h1>

    <DragDropContext>
      <RetroColumn title="Actions" colour="Red" grid={{ gutter: 16, xs: 1, sm: 2, md: 4, lg: 4, xl: 6, xxl: 3 }} cardWidth="200px"/>
    </DragDropContext>
    <div style={{display: "flex"}}>
      <DragDropContext>
        <RetroColumn title="Positive" colour="lime"/>
        <RetroColumn title="Mixed" colour="orange"/>
        <RetroColumn title="Negative" colour="maroon"/>
      </DragDropContext>
    </div>
  </div>
)
  }
}

App.propTypes = {
}

export default App
