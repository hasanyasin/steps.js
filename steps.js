/*
steps.js
	https://github.com/hasanyasin/steps.js

	by hasanyasin (https://github.com/hasanyasin)

** Minimalistic Library for Steps-Oriented Code Organization
Please see README for documentation.

MIT License.
*/

function Step(name, calls, pre, post) {
	var px, p

	if (!(this instanceof Step)) return (new Step(name, calls, pre, post))

	this._done = false
	this.name = name
	this.pre = []
	this.pre_done = []

	if (pre) {
		px=0
		while (p=pre[px++]) {
			if (p._done===false) this.pre.push(p)
			else this.pre_done.push(p)
		}
	}

	this.calls = calls || []
	this.calls_done = []
	this.post = post || []

	return this;
}

Step.prototype.wait = function(cond) { // Add a step to pre list.
	this.pre.push(cond)
	cond.post.push(this)
	return this
}

Step.prototype.add = function() { // Add a call to calls list.
	this.calls.push(arguments)
	return this
}

Step.prototype.sync = function() { // Add a sync call. (First item=false)
	this.calls.push([false].concat([].slice.apply(arguments)))
}

Step.prototype.async = function() { // Add an async call. (First item=-1)
	this.calls.push([-1].concat([].slice.apply(arguments)))
}

Step.prototype.met = function(cond) { // Called by steps in pre list.
	var ix = this.pre.indexOf(cond)
	if (ix===-1) { console.log('WHAT THE HECK? STEP MET TWICE???', this, cond) }
	else this.pre_done.push( this.pre.splice(ix, 1)[0] )

	if (this.pre.length===0) { this.take() }
	return this
}

Step.prototype.done = function() { // Called when all calls are done.
	var px=0, p
	this._done=true
	while (p=this.post[px++])
		p.met(this)
	return this
}

Step.prototype.check = function() { // Take the step if all pre-steps are done.
	if (this.pre.length===0) { this.take() }
}

Step.prototype.take = function() { // Taking this step, running calls list.
	var s = this,
		cx=0, c, rtyp, func, ths, args, cb
	;

	console.log('taking step', s.name)

	while (c=s.calls[cx++]) {
		if (typeof c[0] === 'function') {
			rtyp=-1; func=c[0]; ths=c[1]; args=c[2]
		}
		else { rtyp=c[0]; func=c[1]; ths=c[2]; args=c[3] }

		if (rtyp===false) { // Synchronous function.
			func.apply(ths, args) // We just call it. Lovely.
			s.calls_done.push( s.calls.splice(--cx,1) )
			// and mark as done.
		}
		else { // Oi, Asynchronous!
			cb = (function(v) {	return function () {
				var callx = s.calls.indexOf(v)
				if (callx==-1) {
					console.log('App developer found guilty!'+
						'She calls callback twice!!!', s.calls.length, v)
				}
				else s.calls_done.push( s.calls.splice(callx,1) )
				if (s.calls.length===0) s.done()
			}})(c)

			if (rtyp instanceof Array) { // rtyp = [index, attr_name]
				if (rtyp[0]<0) c[c.length-1][rtyp[1]]=cb // -1 = last item
				else c[rtyp[0]][rtyp[1]]=cb // indexed item
			}

			else { // rtyp = index
				if (rtyp<0) args.push(cb) // -1 = push cb to end of list
				else args.splice(rtyp, 0, cb) // put before indexed item
			}

			func.apply(ths, args) // At last, we are ready! Awesome!
		}

	}

	if (s.calls.length===0) s.done()

	return s
}

module.exports = Step