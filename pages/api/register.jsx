import mailer from "../../utils/mailer"
import jwt from "../../utils/jwt"
import mysql from "../../utils/mysql"
import { apiHandler } from "../../utils/apis"
import validate from '../../utils/validate'

const request = promisify(require('request'));

//todo: validar corretamente todos os campos

const handler = async function (req, res) {
    const response_key = req.body["g-recaptcha-response"];
    const secret_key = process.env.RECAPTCHA_SECRET_KEY;
    const options = {
        url: `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${response_key}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded", 'json': true }
    }
    try {
        const re = await request(options);
        if (!JSON.parse(re.body)['success']) {
            return res.send({ response: "Failed" });
        }
        return res.send({ response: "Successful" });
    } catch (error) {
        return res.send({ response: "Failed" });
    }

    const forumId = validate.name(req.body.forumId, "participante")
    const attendeeName = validate.name(req.body.attendeeName, "participante")
    const attendeeEmail = validate.email(req.body.attendeeEmail, "participante")
    const attendeeDocument = validate.name(req.body.attendeeDocument, "participante")
    const attendeeCategory = validate.name(req.body.attendeeCategory, "participante")
    const statementTitle = validate.name(req.body.statementTitle, "participante")
    const statementText = validate.name(req.body.statementText, "participante")
    const statementCommittee = validate.name(req.body.statementCommittee, "participante")

    const attendeeId = await mysql.createAttendee(forumId, attendeeName, attendeeEmail, attendeeDocument, attendeeCategory, statementTitle, statementText, statementCommittee)
    const attendeeJwt = await jwt.buildJwt({ kind: "attendee", attendeeId })
    const attendeeLink = `${process.env.API_URL_BROWSER}dashboard/${attendeeJwt}`

    if (process.env.LOG_LINKS) console.log(attendeeLink)

    mailer.sendRegistered(attendeeEmail, forumId, forumName, attendeeLink)

    res.status(200).json({ status: 'OK' });
}

export default apiHandler({
    'POST': handler
});