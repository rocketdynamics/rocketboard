import React, { Component } from 'react'
import PropTypes from 'prop-types'
import RetroColumn from './RetroColumn';
import { DragDropContext } from 'react-beautiful-dnd';

import './App.css'
import "antd/dist/antd.css";

import { withRouter } from 'react-router';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Switch
} from 'react-router-dom';

import { connect, PromiseState } from 'react-refetch';

import * as R from "ramda";

const byColumn = R.pipe(R.values, R.groupBy(R.prop("Column")));

let BASE_API_URL = 'http://localhost:5000';
if (window.location.protocol === "https:") {
  BASE_API_URL = window.location.origin;
}

class retrospective extends Component {
  render() {
    const { retrospectiveFetch } = this.props;

    if (retrospectiveFetch.fulfilled) {
      const retrospective = retrospectiveFetch.value;
      if (!retrospective || !retrospective.Cards) {
        return <div>No cards</div>
      };

      const columns = byColumn(retrospective.Cards);

      return (
        <div>
          <DragDropContext>
            <RetroColumn title="Actions" colour="Red" grid={{ gutter: 16, xs: 1, sm: 2, md: 4, lg: 4, xl: 6, xxl: 3 }} cardWidth="200px"/>
          </DragDropContext>
          <div style={{display: "flex"}}>
            <DragDropContext>
              <RetroColumn cards={R.propOr([], "positive")(columns)} title="Positive" colour="lime"/>
              <RetroColumn cards={R.propOr([], "mixed")(columns)} title="Mixed" colour="orange"/>
              <RetroColumn cards={R.propOr([], "negative")(columns)} title="Negative" colour="maroon"/>
            </DragDropContext>
          </div>
        </div>
      );
      } else if (retrospectiveFetch.rejected) {
        return (<div>Error</div>);
    } else {
      return (
        <div>Loading ...</div>
      );
    }
  }
}

const Retrospective = withRouter(connect(props => {
  const { match } = props;
  return {
    retrospectiveFetch: {
      url: `${BASE_API_URL}/query`,
      body: JSON.stringify({
        query: `{
          retrospectiveById(id: "${match.params.id}") {
            id
            name
            columns {
              name
            }
          }
        }`,
        variables: {},
        operationName: null,
      }),
      method: 'POST',
      refreshInterval: 5000,
    },
  };
})(retrospective));

class App extends Component {
  render() {
    return (
  <div className="App">
    <h1>Retrospective</h1>

    <Router>
      <Switch>
        <Route path="/retrospective/:id" component={Retrospective} />
        <Route render={() => (
          <div>Hello World!</div>
        )} />
      </Switch>
    </Router>
  </div>
)
  }
}

App.propTypes = {
}

export default App
