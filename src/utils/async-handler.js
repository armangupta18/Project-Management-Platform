//requestHandler this is function
const asyncHandler = (requestHandler) => { 
    //we r returning higer order function
    return (req, res, next) => {
        Promise
            .resolve(requestHandler(req, res, next))
            .catch((err) => next(err))
        //automatically handles all the errors and pass it on to the Express's inbuilt error.
        //So dont write try catch mannual
        
    }
}

export {asyncHandler}