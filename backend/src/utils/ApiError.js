class ApiError extends Error{

    constructor(
        statusCode,
        message="something went worng",
        error=[],
        stack=""
    ){
        super(message)
        this.statusCode= statusCode
        this.data= null
        this.message=message
        this.error= error
        this.sussess= false

        if(stack){
            this.stack= stack
        }else{
         Error.captureStackTrace(this,this.constructor)
        }

    }
}
export {ApiError}