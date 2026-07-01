const asynchandler =  (rquesthandler) =>{
    return (req, res, next) =>  {
        Promise.resolve(rquesthandler(req, res, next))
        .catch((err)=>next(err));
}
}
export default (asynchandler);