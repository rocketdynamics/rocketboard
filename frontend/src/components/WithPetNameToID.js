import React from "react";
import { Query } from "react-apollo";

import { GET_RETROSPECTIVE_ID } from "../queries";

const WithPetNameToID = petName => WrappedComponent => {
   const component = props => (
       <Query query={GET_RETROSPECTIVE_ID} variables={{petName}}>
           {({ loading, data, error }) => {
                if (!data || !data.retrospectiveByPetName) {
                    return (
                        <div className="page-retrospective">
                            <div className={"retrospective-loading" + (loading ? "" : " loading-finished")}>
                                <pre className="loading-text">
                                    R  O  C  K  E  T  B  O  A  R  D
                                </pre>
                            </div>
                        </div>
                    )
                }
                return (
                    <WrappedComponent id={data.retrospectiveByPetName.id} {...props} />
                );
           }}
       </Query>
   );

   component.displayName = `WithPetNameToID(${WrappedComponent.displayName ||
       WrappedComponent.name ||
       "WrappedComponent"})`;

   return component;
};

export default WithPetNameToID;
