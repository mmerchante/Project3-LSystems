const THREE = require('three');
var Random = require("random-js");

import { LSystem, LRule, LInstruction, DummyInstruction } from './lsystem.js'

class PlantContext
{
	constructor(position, rotation, branchLength, random) 
	{
		this.position = position.clone();
		this.rotation = rotation.clone();
		this.branchLength = branchLength;
		this.random = random;
	}
}

function copyContext(context)
{
	return new PlantContext(context.position, context.rotation, context.branchLength, context.random);
}

// A more specific instruction that can modify branches
class BranchInstruction extends LInstruction
{
	constructor()
	{
		super();
		// TODO: parametrization of branch modification
	}
	symbol() { return "B"; }

	evaluate(context, stack)
	{
		var c = copyContext(context);
		c.branchLength *= .65;
		return c;
	}
}

class ForwardInstruction extends LInstruction 
{  
	symbol() { return "F"; }

	evaluate(context, stack) 
	{
		var c = copyContext(context);
		c.position.add(new THREE.Vector3(0, context.branchLength, 0).applyQuaternion(c.rotation));


		// // TWIST
		// var euler = new THREE.Euler(0, 1.5, 0);
		// var quat = new THREE.Quaternion();
		// quat.setFromEuler(euler);

		// c.rotation.multiply(quat);

		return c;
	}
}

class DetailInstruction extends LInstruction 
{  
	symbol() { return "Q"; }

	evaluate(context, stack) 
	{
		var c = copyContext(context);

		var min = context.branchLength / 15;
		var max = context.branchLength / 3;
		var randomness = context.branchLength / 5;

		var r = new THREE.Vector3(c.random.real(0,1, true), c.random.real(0,1, true), c.random.real(0,1, true)).multiplyScalar(randomness);
		c.position.add(new THREE.Vector3(0, c.random.real(min, max, true), 0).add(r).applyQuaternion(c.rotation));

		// TODO: consider the rotation!

		return c;
	}
}

class RotatePositiveInstruction extends LInstruction
{
	symbol() { return "+"; }

	evaluate(context, stack) {
		var c = copyContext(context);

		var euler = new THREE.Euler(0, 0, 1.25 * c.random.real(0,1, true));
		var quat = new THREE.Quaternion();
		quat.setFromEuler(euler);

		c.rotation.multiply(quat);
		return c;
	}
}

class RotateNegativeInstruction extends LInstruction
{
	symbol() { return "-"; }

	evaluate(context, stack) {
		var c = copyContext(context);
		
		var euler = new THREE.Euler(0, 0, -1.25 * c.random.real(0,1, true));
		var quat = new THREE.Quaternion();
		quat.setFromEuler(euler);

		c.rotation.multiply(quat);
		return c;
	}
}


function crossSection(t, a, b, m1, m2, n1, n2, n3)
{
	var term1 = Math.pow(Math.abs(Math.cos(m1 * t * .25) / a), n2);
	var term2 = Math.pow(Math.abs(Math.sin(m2 * t * .25) / b), n3);

	return Math.pow(term1 + term2, -1.0 / n1);
}

export default class PlantLSystem
{
	constructor()
	{
		var instructions = [new ForwardInstruction(), 
						new DummyInstruction("X"), 
						new DummyInstruction("Y"), 
						new RotateNegativeInstruction(), 
						new RotatePositiveInstruction(),
						new BranchInstruction(),
						new DetailInstruction()];

		var rules = [];
		// rules.push(new LRule("X", "FX", 1.0));
		rules.push(new LRule("X", "[B-FY][B+FY]FX", 1.0));
		rules.push(new LRule("Y", "[B-FY]", 1.0));

		// Detailing the branches
		rules.push(new LRule("F", "QQQ", 1.0));

		// rules.push(new LRule("X", "FX", 1.0));

		this.system = new LSystem("FFX", instructions, rules, 10);
	}

	expand()
	{
		return this.system.expand();
	}

	evaluate()
	{
		var random = new Random(Random.engines.mt19937().seed(0));
		var state = new PlantContext(new THREE.Vector3(0,0,0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,0)), 1.0, random);
		return this.system.evaluate(state);
	}

	getLineDebugger()
	{
		var material = new THREE.LineBasicMaterial({ color: 0xffffff });
		var geometry = new THREE.Geometry();

		var stateArray = this.evaluate();

		var prevPosition = stateArray[0].position;

		for(var i = 0; i < stateArray.length; i++)
		{
			var p = stateArray[i].position;

			if(prevPosition.distanceTo(p) > .01)
			{
				var subdivs = 64;

				for(var s = 0; s < subdivs; s++)
				{
					var theta = s * 2 * 3.1415 / subdivs;
					var x = Math.cos(theta);
					var y = Math.sin(theta);

					// function crossSection(t, a, b, m1, m2, n1, n2, n3)
					var r = crossSection(theta, 1, 1, 2, 10, -1.5,  1,1) * .1;

					var point = p.clone().add(new THREE.Vector3(x * r, 0, y * r).applyQuaternion(stateArray[i].rotation));

					geometry.vertices.push(point);
				}

			}

			prevPosition = p;
		}

		return new THREE.Line(geometry, material);
	}
}

// function EvaluatePlant() 
// {
// 	var instructions = [new ForwardInstruction(), 
// 						new DummyInstruction("X"), 
// 						new RotateNegativeInstruction(), 
// 						new RotatePositiveInstruction()];

// 	var rules = [];
// 	rules.push(new LRule("X", "[-FX][+FX]", 1.0));

// 	return new LSystem("FX", instructions, rules, 5);
// }