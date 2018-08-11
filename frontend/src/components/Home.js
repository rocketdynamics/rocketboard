import React from "react";
import gql from "graphql-tag";
import { Mutation } from "react-apollo";
import * as R from "ramda";
import { Redirect } from "react-router";

import "wired-elements";

const START_RETROSPECTIVE = gql`
    mutation StartRetrospective {
        startRetrospective(name: "")
    }
`;

const Home = () => (
    <div className="page-home">
        <Mutation mutation={START_RETROSPECTIVE}>
            {(startRetrospective, { data, loading }) => {
                const id = R.prop("startRetrospective", data);
                const extraProps = {};
                if (loading) {
                    extraProps.disabled = true;
                }
                if (id) {
                    return <Redirect to={`/${id}/`} />;
                }

                return (
                    <wired-button
                        elevation={2}
                        onClick={e => {
                            e.preventDefault();
                            startRetrospective();
                        }}
                        {...extraProps}
                    >
                        {loading ? "Launching 🚀" : "Launch 🚀 Growth™"}
                    </wired-button>
                );
            }}
        </Mutation>
    </div>
);

export default Home;
