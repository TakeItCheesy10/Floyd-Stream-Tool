// Incorporate remote score presses without publishing or losing unfinished fields.
function mergeLiveDraft(pending, previous, latest) {
    const merged = {...latest};
    for (const [key,value] of Object.entries(pending)) {
        if (String(value) !== String(previous[key])) merged[key] = value;
    }
    return merged;
}
if (typeof module !== 'undefined') module.exports = {mergeLiveDraft};
