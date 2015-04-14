// simple-todos.js

Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {
  Meteor.subscribe("tasks");

  Template.body.helpers({
    tasks: function() {
      // if hide completer checked, filter tasks
      if (Session.get("hideCompleted")) {
        // $ne:true is Mongo for "not equal to true" 
        return Tasks.find({
          checked: {$ne: true}
        }, {
          sort: {createdAt: -1}
        });
      } else {
        // otherwise return all tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function(){
      return Session.get("hideCompleted");
    },
    incompleteCount: function() {
      // cursor.count() is a mongo method
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({
    "submit .new-task": function(event) {
      console.log(event);
      console.log(event.target);
      var text = event.target.text.value;
      // method call
      Meteor.call("addTask", text);

      // clear form
      event.target.text.value = "";

      // prevent default form submit
      return false;
    },
    "change .hide-completed input": function(event) {
      // event.target.checked give true/false value
      // changes a session, so only local to client
      Session.set("hideCompleted", event.target.checked);
    }
  });

  Template.task.helpers({
    isOwner: function() {
      return this.owner === Meteor.userId();
    }
  });

  Template.task.events({
    "click .toggle-checked": function() {
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    "click .delete": function() {
      Meteor.call("deleteTask", this._id);
    },
    "click .toggle-private": function() {
      // arguments.. ! this.private
      Meteor.call("setPrivate", this._id, ! this.privateOn);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
} // end client



if (Meteor.isServer) {
  Meteor.publish("tasks", function() {
    return Tasks.find({
      $or: [      // must have at least one of following:
        { privateOn: { $ne: true } },  // not private, or
        { owner: this.userId }         // user owns it
      ]
    });
});

} // end server


Meteor.methods({
  addTask: function(text) {
    // make sure user logged in before insert
    if ( ! Meteor.userId() ) {
      throw new Meteor.Error("not-authorized");
    }
    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function(taskId) {
    // ensure ownership to delete private tasks
    var task = Tasks.findOne(taskId);
    if ( task.privateOn && task.owner !== Meteor.userId() ) {
      throw new Meteor.Error("not-authorized");
    }
    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if ( task.privateOn && task.owner !== Meteor.userId() ) {
      throw new Meteor.Error("not-authorized");
    }
    Tasks.update(taskId, {$set: {checked: setChecked} })
  },
  setPrivate: function(taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);
    // ensure ownership
    if ( task.owner !== Meteor.userId() ) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { privateOn: setToPrivate } });
  }
}); // end methods


