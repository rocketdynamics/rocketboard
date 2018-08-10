const fetchReducer = (state = {}, action) => {
  console.log(action.type, action.payload)
  switch (action.type) {
    default:
      return state;
  }
}

export default fetchReducer
