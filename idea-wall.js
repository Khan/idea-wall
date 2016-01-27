Stickies = new Mongo.Collection("stickies");

if (Meteor.isClient) {
  Session.set("lastMouse", null);
  Session.set("editingLabel", null);

  Template.board.helpers({
    stickies: function() {
      return Stickies.find({});
    },
  });

  Template.board.events({
    'click': function(event) {
      if (event.target.id === "board") {
        if (Session.get("editing") !== null) {
          Session.set("editing", null);
        } else {
          const newSticky = Stickies.insert({label: "New Sticky", x: event.pageX - 50, y: event.pageY - 50}, function(error, id) {
            Session.set("editing", id);
            Tracker.afterFlush(function() {
              const stickyElement = document.getElementById(id);
              const label = stickyElement.getElementsByClassName("label")[0];
              label.focus();
              label.selectionStart = 0
              label.selectionEnd = 1000000
            });            
          });
        }
        event.preventDefault();
        event.stopPropagation();
      }
    },
  })

  Template.sticky.helpers({
    isEditing: function() {
      return Session.get("editing") === this._id;
    },

    tooltipHiddenness: function() {
      return Session.get("editing") === this._id ? "" : "hide-tooltip"
    },

    memoContainerHiddenness: function() {
      const memo = this.memo
      return (memo === null || memo === undefined || memo === "") ? "hidden" : "";
    },
  })

  Template.sticky.onRendered(function () {
    const editor = this.find(".source");
    const quill = new Quill(editor, {
      modules: { 'link-tooltip': true },
      'theme': 'snow',
    });
    const id = this.data._id
    quill.on('selection-change', function(range) {
      if (range !== null) {
        Session.set("editing", id);
      } else {
        Stickies.update(id, {$set: {source: quill.getHTML()}});
      }
    })
    quill.on('text-change', function(delta, source) {
      if (source === 'user') {
        // Stickies.update(id, {$set: {source: quill.getHTML()}});
      }
    })

    this.autorun(function() {
      quill.setHTML(Template.currentData().source)
    })
  });

  Template.sticky.events({
    'mousedown .sticky': function (event) {
      Session.set("lastMouse", {x: event.pageX, y: event.pageY});

      document.onmousemove = function(moveEvent) {
        const lastMouse = Session.get("lastMouse")
        if (lastMouse !== null) {
          Session.set("clickDisabled", true);
          Stickies.update(event.currentTarget.id, {$inc: {x: moveEvent.pageX - lastMouse.x, y: moveEvent.pageY - lastMouse.y}})
          Session.set("lastMouse", {x: moveEvent.pageX, y: moveEvent.pageY});
          moveEvent.stopPropagation()
          moveEvent.preventDefault()
        } 
      };

      document.onmouseup = function(upEvent) {
        Session.set("lastMouse", null);
        upEvent.stopImmediatePropagation();
        upEvent.preventDefault();

        setTimeout(function() {
          Session.set("clickDisabled", false);
        }, 50);

        document.onmousemove = undefined;
        document.onmouseup = undefined;
      }
    },

    'click h1': function (event) {
      if (Session.get("clickDisabled") !== true) {
        Session.set("editing", this._id);

        Tracker.afterFlush(function() {
          const label = event.target.getElementsByClassName("label")[0];
          label.focus();
        });
      }

      event.preventDefault();
      event.stopPropagation();
    },

    'change': function(event) {
      const newLabel = Template.instance().find("textarea.label").value;
      const newMemo = Template.instance().find("textarea.memo").value;
      Stickies.update(this._id, {$set: {label: newLabel, memo: newMemo}});
      event.stopPropagation();
    },

    'focus textarea.memo': function(event) {
      Session.set("editing", this._id);
    },

    'submit': function(event) {
      submitSticky(this._id, Template.instance());
      event.preventDefault();
    },

    'keydown textarea': function(event) {
      if (event.keyCode == 13) {
        event.preventDefault();
        submitSticky(this._id, Template.instance())
        event.target.blur();
      }
    },

    'click .delete': function(event) {
      if (Session.get("clickDisabled") !== true) {
        Stickies.remove(this._id);
        Session.set("editing", null);
      }
      event.stopPropagation();
    },
  });
}

function submitSticky(id, templateInstance) {
  const newLabel = templateInstance.find("textarea.label").value;
  Stickies.update(id, {$set: {label: newLabel}});
  Session.set("editing", null);
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
