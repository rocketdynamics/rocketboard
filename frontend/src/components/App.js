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

const cardsForColumn = function(columns, name) {
  if (columns === null) {
    return [];
  }
  return R.propOr([], 'cards')(R.filter(R.propEq('name', name))(columns)[0]);
};

let BASE_API_URL = 'http://localhost:5000';
if (window.location.protocol === "https:") {
  BASE_API_URL = window.location.origin;
}

class retrospective extends Component {
  render() {
    const { retrospectiveFetch } = this.props;

    if (retrospectiveFetch.fulfilled) {
      const retrospective = retrospectiveFetch.value.data.retrospectiveById;

      return (
        <div>
          <DragDropContext>
            <RetroColumn title="Actions" colour="Red" grid={{ gutter: 16, xs: 1, sm: 2, md: 4, lg: 4, xl: 6, xxl: 3 }} cardWidth="200px"/>
          </DragDropContext>
          <div style={{display: "flex"}}>
            <DragDropContext>
              <RetroColumn cards={cardsForColumn(retrospective.columns, "positive")} title="Positive" colour="lime"/>
              <RetroColumn cards={cardsForColumn(retrospective.columns, "mixed")} title="Mixed" colour="orange"/>
              <RetroColumn cards={cardsForColumn(retrospective.columns, "negative")} title="Negative" colour="maroon"/>
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
              cards {
                id
                message
              }
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
          <div>
            <a href="/retrospective/new">New Retro</a>
          </div>
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
