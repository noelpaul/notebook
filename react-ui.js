const { useEffect, useState, useCallback, useRef } = React;
const rootElement = document.getElementById("root");
const metaElements = document.getElementsByTagName("meta");

const { STORE_KEYS, ACTIONS, META_LIST } = window.APP;

const stringToArray = (text) => {
  let body = [];
  const matches = text.match(
    /(https?\:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gm
  );
  if (matches) {
    matches.forEach((match) => {
      const pos = text.indexOf(match);
      if (pos !== 0) body.push({ type: "text", body: text.slice(0, pos) });
      body.push({
        type: "link",
        link: match.includes("http") ? match : `http://${match}`,
        body: match,
      });
      text = text.slice(pos + match.length);
    });
    if (text.length !== 0) body.push({ type: "text", body: text });
  } else {
    body.push({ type: "text", body: text });
  }
  return body;
};

const arrayToString = (arr) => {
  let text = "";
  arr.forEach((i) => (text += i.body));
  return text;
};

const useLocalStorage = (key, initialvalue, stale) => {
  const [staled, setStaled] = stale;

  const load = () => {
    const savedvalue = JSON.parse(localStorage.getItem(key));
    if (savedvalue !== null) return savedvalue;
    return initialvalue;
  };

  const [value, setvalue] = useState(load());

  const refresh = () => setvalue(load());

  useEffect(() => {
    if (staled === key) refresh();
  }, [staled]);

  useEffect(() => {
    if (JSON.parse(sessionStorage.getItem(key))) {
      if (staled === "") {
        localStorage.setItem(key, JSON.stringify(value));
        window.APP.sendMessage({ action: ACTIONS.RELOAD_DATA, key });
      } else setStaled("");
    } else sessionStorage.setItem(key, true);
  }, [value]);

  return [value, setvalue, refresh];
};

const Check = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
    </svg>
  );
};

const Note = ({
  showLinks,
  note,
  handleEdit,
  handleDelete,
  setEditing,
  editing,
  copyNote,
}) => {
  const { id, completed } = note;
  return (
    <div
      className={`note${note.new ? " enter-anim" : ""}${
        note.deleted ? " delete-anim" : ""
      }${completed ? " completed" : ""}`}
      key={id}
    >
      <p>
        {note.body.map((content) => {
          if (showLinks) {
            if (content.type === "text") return <>{content.body}</>;
            else {
              return (
                <a
                  href={content.link}
                  title={content.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {content.body}
                </a>
              );
            }
          } else return <>{content.body}</>;
        })}
      </p>
      <div className={`actions${editing === id ? " open" : ""}`}>
        <button title="Copy" onClick={() => copyNote(id)} class="button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
          </svg>
        </button>
        <button
          title={completed ? "Mark as not done" : "Mark as done"}
          onClick={() => handleEdit(id)}
          class={`button mark${completed ? " completed" : ""}`}
        >
          {completed ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          ) : (
            <Check />
          )}
        </button>
        <button
          onClick={
            editing === id ? () => setEditing(false) : () => setEditing(id)
          }
          className={`button edit${editing === id ? " editing" : ""}`}
          title={editing === id ? "Stop editing" : "Edit"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M3.95 16.7v3.4h3.4l9.8-9.9-3.4-3.4-9.8 9.9zm15.8-9.1c.4-.4.4-.9 0-1.3l-2.1-2.1c-.4-.4-.9-.4-1.3 0l-1.6 1.6 3.4 3.4 1.6-1.6z" />
          </svg>
        </button>
        <button
          onClick={(e) => handleDelete(e, id)}
          className="button delete"
          title="Delete"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const CheckBox = ({ checked }) => {
  return (
    <span className={checked ? "checkbox checked" : "checkbox"}>
      <Check />
    </span>
  );
};
``;

const App = () => {
  const stale = useState("");
  const [staled, setStaled] = stale;
  const [notes, setNotes] = useLocalStorage(STORE_KEYS.NOTES, [], stale);
  const [theme, setTheme] = useLocalStorage(STORE_KEYS.THEME, false, stale);
  const [newNote, setNewNote] = useLocalStorage(STORE_KEYS.NEWNOTE, "", stale);
  const [enterSend, setEnterSend] = useLocalStorage(
    STORE_KEYS.ENTERSEND,
    false,
    stale
  );
  const [isNote, setIsNote] = useState(false);
  const [alert, setAlert] = useState("");
  const [undo, setUndo] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showLinks, setShowLinks] = useState(true);
  const [nav, setNav] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [version, setVersion] = useState(0);
  const [updating, setUpdating] = useState(false);
  const textarea = useRef();
  const undoTimeoutRef = useRef();

  useEffect(async () => {
    window.APP.init()
      .then((reg) => {
        navigator.serviceWorker.addEventListener("message", (event) => {
          switch (event.data.action) {
            case ACTIONS.RELOAD_DATA: {
              setStaled(event.data.key);
              break;
            }
            case ACTIONS.UPDATE_AVAILABLE: {
              if (window.APP.newServiceWorker) setUpdateAvailable(true);
              break;
            }
            case ACTIONS.VERSION: {
              setVersion(event.data.version);
              break;
            }
          }
        });
        return reg;
      })
      .then(() => {
        window.APP.sendMessage({ action: ACTIONS.VERSION });
      });
    textarea.current.focus();
    textarea.current.selectionStart = newNote.length;
  }, []);

  useEffect(() => {
    setIsNote(!/^\s*$/g.test(newNote));
    updateInputSize();
    textarea.current.focus();
  }, [newNote]);

  useEffect(() => {
    textarea.current.focus();
  }, [textarea.current]);

  useEffect(() => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    if (undo === false) undoTimeoutRef.current = false;
    else undoTimeoutRef.current = setTimeout(() => setUndo(false), 5000);
  }, [undo]);

  useEffect(() => {
    if (alert !== "") setTimeout(() => setAlert(""), 3000);
  }, [alert]);

  useEffect(() => {
    if (!nav) document.activeElement.blur();
  }, [nav]);

  useEffect(() => {
    const themeColor = theme ? "#1976d2" : "#161b22";
    if (theme) rootElement.classList.remove("dark");
    else rootElement.classList.add("dark");
    for (let i = 0; i < metaElements.length; i++) {
      if (META_LIST.includes(metaElements[i].name)) {
        metaElements[i].content = themeColor;
      }
    }
  }, [theme]);

  useEffect(() => {
    setTimeout(() => {
      if (notes.some((i) => i.new === true)) {
        setNotes(
          notes.map((i) => {
            if (i.new) return { ...i, new: undefined };
            return i;
          })
        );
      }
    }, 400);
  }, [notes]);

  const SetNotes = useCallback(
    (newNotes, undoText) => {
      const oldNotes = notes;
      setUndo({ text: undoText, func: () => setNotes(oldNotes) });
      setNotes(newNotes);
    },
    [notes]
  );

  const updateInputSize = useCallback(() => {
    const el = textarea.current;
    if (
      el.style.height.slice(0, -2) == el.scrollHeight ||
      (el.scrollHeight > 170
        ? el.style.height.slice(0, -2) === 170
          ? true
          : false
        : false)
    )
      return;
    el.style.height = "50px";
    el.style.height = el.scrollHeight + "px";
    el.style.overflowY = el.scrollHeight < 170 ? "hidden" : "auto";
  }, [textarea.current]);

  useEffect(() => {
    if (editing === true) {
      setNewNote(arrayToString(notes.find((i) => i.id === editing).body));
    } else if (editing === false) {
      setNewNote("");
    }
  }, [editing]);

  const saveEditedNote = useCallback(() => {
    if (isNote) {
      setNotes(
        notes.map((i) => {
          if (i.id === editing) {
            return {
              ...i,
              body: stringToArray(newNote),
            };
          }
          return i;
        })
      );
      setEditing(false);
      setAlert("Note edited");
    } else return;
  }, [isNote, newNote, textarea.current, notes]);

  const saveNewNote = useCallback(() => {
    if (isNote) {
      setNotes([
        {
          id: new Date().getTime(),
          body: stringToArray(newNote.trim()),
          completed: false,
          new: true,
        },
        ...notes,
      ]);
      setNewNote("");
    } else return;
  }, [isNote, newNote, textarea.current, notes]);

  const handleDelete = useCallback(
    (e, id) => {
      if (editing === id) setEditing(false);
      setNotes(
        notes.map((i) => {
          if (i.id === id) return { ...i, deleted: true };
          return i;
        })
      );
      setTimeout(() => {
        SetNotes(
          notes.filter((note) => note.id !== id),
          "Note deleted"
        );
      }, 400);
    },
    [notes, editing, undoTimeoutRef.current, SetNotes]
  );

  const handleEdit = useCallback(
    (id) => {
      const Newnotes = notes.map((item) => {
        if (item.id === id) {
          item.completed = !item.completed;
          return item;
        } else return item;
      });
      setNotes(Newnotes);
    },
    [notes]
  );

  const handleChange = useCallback(
    (e) => {
      if (
        enterSend &&
        e.target.value.slice(0, textarea.current.selectionStart).slice(-1) ===
          "\n"
      ) {
        if (editing) saveEditedNote();
        else saveNewNote();
      } else setNewNote(e.target.value);
    },
    [enterSend, textarea.current, saveNewNote, saveEditedNote, editing]
  );

  const removeall = useCallback(() => {
    if (confirm("Delete All Notes")) {
      SetNotes([], "Deleted all Notes");
      setNav(false);
    }
  }, [SetNotes]);

  const copyNote = useCallback(
    async (id) => {
      await window.APP.copyToClipBoard(
        arrayToString(notes.find((i) => i.id === id).body)
      );
      setAlert("Copied note ✓");
    },
    [notes]
  );

  if (updating) return <span class="preloader">Updating</span>;
  else {
    return (
      <div className={theme ? "html" : "html dark"}>
        <div className="header-cont">
          <div className="header">
            <p>Notebook</p>
            <button onClick={() => setNav(!nav)} title="Menu">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
              >
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className={nav ? "nav-cont nav-cont-show" : "nav-cont"}
          onClick={(e) => {
            if (e.target.id === "nav-cont") setNav(false);
          }}
          id="nav-cont"
        >
          <div className={nav ? "nav nav-show" : "nav"}>
            <button onClick={() => setEnterSend(!enterSend)}>
              'Enter' key is save
              <CheckBox checked={enterSend} />
            </button>
            <button onClick={() => setShowLinks(!showLinks)}>
              Show Url's as Links
              <CheckBox checked={showLinks} />
            </button>
            <button onClick={() => setTheme(!theme)}>
              Dark theme
              <CheckBox checked={!theme} />
            </button>
            <button onClick={removeall}>Delete All Notes</button>
            <p className="about">version : {version}</p>
            <p className="about">
              Do not delete localStorage data! Notes are stored in localStorage
              and could be lost during an update so keep a backup of your
              important information
            </p>
          </div>
        </div>

        <div className="popup-cont">
          {alert !== "" && (
            <div className="popup">
              <span>{alert}</span>
            </div>
          )}

          {undo.func && (
            <div className="popup">
              <span>{undo.text}</span>
              <button
                onClick={() => {
                  undo.func();
                  setUndo(false);
                }}
              >
                undo
              </button>
            </div>
          )}

          {updateAvailable && (
            <div className="popup">
              <span>Update available for Notebook</span>
              <button
                onClick={() => {
                  setUpdating(true);
                  window.APP.sendMessage(
                    { action: ACTIONS.UPDATE },
                    window.APP.newServiceWorker
                  );
                }}
              >
                update
              </button>
            </div>
          )}
        </div>

        <div className="form">
          <textarea
            title="Type a note"
            className={isNote ? "textarea" : "notextarea"}
            rows={1}
            ref={textarea}
            value={newNote}
            onChange={handleChange}
          ></textarea>
          <span className="placeholder">Type a note</span>
          <button
            title="Save Note"
            onClick={editing ? saveEditedNote : saveNewNote}
            className={isNote ? "save" : "nosave"}
            tabIndex={isNote ? 0 : -1}
          >
            save
          </button>
        </div>

        <div className="container">
          {notes && notes.length !== 0 ? (
            notes.map((item) => (
              <Note
                showLinks={showLinks}
                note={item}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                setEditing={setEditing}
                editing={editing}
                copyNote={copyNote}
              />
            ))
          ) : (
            <div className="nonotes">No Saved Notes ☹️</div>
          )}
        </div>
      </div>
    );
  }
};

ReactDOM.render(<App />, rootElement);
