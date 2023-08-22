import Head from 'next/head'
import styles from '../styles/Home.module.css';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import React, { useState } from 'react'
import Fetcher from '../utils/fetcher'
import Validate from '../utils/validate'
import Layout from '../components/layout'
import ReCAPTCHA from "react-google-recaptcha";
import * as formik from 'formik';
import * as yup from 'yup';

const recaptchaRef = React.createRef();

export async function getServerSideProps({ params }) {
  return {
    props: {
      API_URL_BROWSER: process.env.API_URL_BROWSER
    },
  };
}

export default function Create(props) {
  const [created, setCreated] = useState(false)
  const { Formik, FieldArray } = formik;

  const schema = yup.object().shape({
    attendeeName: yup.string().required('Nome deve ser preenchido'),
    attendeeChosenName: yup.string(),
    attendeeEmail: yup.string().required('E-mail deve ser preenchido').email('E-mail inválido'),
    attendeeEmailConfirmation: yup.string().required('Confirmação de e-mail deve ser preenchido').oneOf([yup.ref('attendeeEmail'), null], 'Confirmação de e-mail deve ser igual ao e-mail'),
    attendeePhone: yup.string().required('Telefone deve ser preenchido'),
    attendeeDisabilityYN: yup.bool().required('Pessoa com deficiência deve ser preenchido').oneOf([true, false], 'Pessoa com Deficiência deve ser Sim ou Não'),
    attendeeDisability: yup.string()
      .when('attendeeDisabilityYN', {
        is: (attendeeDisabilityYN) => attendeeDisabilityYN,
        then: yup.string().required('Descrição da necessidade de atendimento especial deve ser preenchida')
      }),
    attendeeDocument: yup.string().required('CPF deve ser preenchido').test(
      'test-invalid-cpf',
      'CPF inválido',
      (cpf) => Validate.validateCPF(cpf)),
    attendeeCategory: yup.string().required('Categoria deve ser selecionada'),
    statement: yup.array().of(
      yup.object().shape({
        text: yup.string().required('Texto do enunciado deve ser preenchido').max(800, 'Deve respeitar o limite máximo de 800 caracteres'),
        justification: yup.string().required('Justificativa do enunciado deve ser preenchida').max(1600, 'Deve respeitar o limite máximo de 1600 caracteres'),
        committee: yup.string().required('Comissão deve ser seleciondada')
      }))
  });

  const handleChangeAttendeePhone = (evt) => {
    let data = event.target.value.replace(/\D/g, "");
    if (data.length > 11) data = data.substr(0, 11)
    data = data.replace(/\D/g, '')
    data = data.replace(/(\d{2})(\d)/, "($1) $2")
    data = data.replace(/(\d)(\d{4})$/, "$1-$2")
    return data
  };
  const handleChangeAttendeeDocument = (evt) => {
    // Get only the numbers from the data input
    let data = event.target.value.replace(/\D/g, "");
    // Checking data length to define if it is cpf or cnpj
    if (data.length > 11) data = data.substr(0, 11)
    // It's cpf
    let cpf = "";
    let parts = Math.ceil(data.length / 3);
    for (let i = 0; i < parts; i++) {
      if (i === 3) {
        cpf += `-${data.substr(i * 3)}`;
        break;
      }
      cpf += `${i !== 0 ? "." : ""}${data.substr(i * 3, 3)}`;
    }
    // Pass formatting for the data
    data = cpf;
    // Update state
    return data;
  };

  const handleClickAddStatement = () => {
    setStatement([...statement, { ...emptyStatement }])
  };

  const handleClickRemoveStatement = (i) => {
    const a = [...statement].splice(i)
    setStatement(a)
  };

  const handleSubmit = async (event) => {
    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();
    }

    setValidated(true);

    console.log('register')
    setCreating(true)
    const recaptchaToken = await recaptchaRef.current.executeAsync();
    try {
      await Fetcher.post(`${props.API_URL_BROWSER}api/register`, { recaptchaToken, attendeeName, attendeeEmail, attendeeDocument, attendeeCategory }, { setErrorMessage })
      setCreated(true)
    } catch (e) { }
    setCreating(false)
  };

  const onChange = () => {

  }

  return (
    <Layout >
      <h1 className='mb-4'>Inscrição</h1>

      {created
        ? <p className='alert alert-success'>Inscrição realizada com sucesso. Consulte o email "{attendeeEmail}" para ver a confirmação.</p>
        : <>
          <p>
            Faça sua incrição e sugira um, dois ou três enunciados para serem debatidos.
          </p>

          <Formik
            validationSchema={schema}
            onSubmit={console.log}
            initialValues={{
              attendeeName: '',
              attendeeChosenName: '',
              attendeeEmail: '',
              attendeeEmailConfirmation: '',
              attendeePhone: '',
              attendeeDocument: '',
              attendeeCategory: undefined,
              attendeeDisabilityYN: false,
              attendeeDisability: '',
              statement: [{
                text: '',
                justification: '',
                committee: undefined
              }]
            }}
          >
            {({ handleSubmit, handleChange, values, touched, errors, isSubmitting }) => (
              <Form noValidate onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col col-12 col-lg-6">
                    <Form.Group className="mb-3" controlId="attendeeName">
                      <Form.Label>Nome Completo</Form.Label>
                      <Form.Control type="text" value={values.attendeeName} onChange={handleChange} isValid={touched.attendeeName && !errors.attendeeName} isInvalid={touched.attendeeName && errors.attendeeName} />
                      <Form.Control.Feedback type="invalid">{errors.attendeeName}</Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div className="col col-12 col-lg-6">
                    <Form.Group className="mb-3" controlId="attendeeChosenName">
                      <Form.Label>Nome Social (opcional)</Form.Label>
                      <Form.Control type="text" value={values.attendeeChosenName} onChange={handleChange} isValid={touched.attendeeChosenName && !errors.attendeeChosenName} isInvalid={touched.attendeeChosenName && errors.attendeeChosenName} />
                      <Form.Control.Feedback type="invalid">{errors.attendeeChosenName}</Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div className="col col-12 col-lg-3">
                    <Form.Group className="mb-3" controlId="attendeeEmail">
                      <Form.Label>E-mail</Form.Label>
                      <Form.Control type="email" value={values.attendeeEmail} onChange={handleChange} isValid={touched.attendeeEmail && !errors.attendeeEmail} isInvalid={touched.attendeeEmail && errors.attendeeEmail} />
                      <Form.Control.Feedback type="invalid">{errors.attendeeEmail}</Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div className="col col-12 col-lg-3">
                    <Form.Group className="mb-3" controlId="attendeeEmailConfirmation">
                      <Form.Label>Confirmação de E-mail</Form.Label>
                      <Form.Control type="email" value={values.attendeeEmailConfirmation} onChange={handleChange} isValid={touched.attendeeEmailConfirmation && !errors.attendeeEmailConfirmation} isInvalid={touched.attendeeEmailConfirmation && errors.attendeeEmailConfirmation} />
                      <Form.Control.Feedback type="invalid">{errors.attendeeEmailConfirmation}</Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div className="col col-12 col-lg-3">
                    <Form.Group className="mb-3" controlId="attendeePhone">
                      <Form.Label>Telefone</Form.Label>
                      <Form.Control type="text" value={values.attendeePhone} onChange={(evt) => { evt.target.value = handleChangeAttendeePhone(evt.target.value); handleChange(evt) }} isValid={touched.attendeePhone && !errors.attendeePhone} isInvalid={touched.attendeePhone && errors.attendeePhone} />
                      <Form.Control.Feedback type="invalid">{errors.attendeePhone}</Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div className="col col-12 col-lg-3">
                    <Form.Group className="mb-3" controlId="attendeeDocument">
                      <Form.Label>CPF</Form.Label>
                      <Form.Control type="text" value={values.attendeeDocument} onChange={(evt) => { evt.target.value = handleChangeAttendeeDocument(evt.target.value); handleChange(evt) }} isValid={touched.attendeeDocument && !errors.attendeeDocument} isInvalid={touched.attendeeDocument && errors.attendeeDocument} />
                      <Form.Control.Feedback type="invalid">{errors.attendeeDocument}</Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div className="col col-12 col-lg-3">
                    <Form.Group className="mb-3" controlId="attendeeCategory">
                      <Form.Label>Categoria</Form.Label>
                      <Form.Control as="select" value={values.attendeeCategory} onChange={handleChange} isValid={touched.attendeeCategory && !errors.attendeeCategory} isInvalid={touched.attendeeCategory && errors.attendeeCategory} >
                        <option value disabled selected hidden>[Selecione]</option>
                        <option value="1">Jurista</option>
                        <option value="2">Especialista</option>
                        <option value="3">Magistrado</option>
                        <option value="4">Outro</option>
                      </Form.Control>
                      <Form.Control.Feedback type="invalid">{errors.attendeeCategory}</Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div className="col col-12 col-lg-3">
                    <Form.Group className="mb-3" controlId="attendeeDisabilityYN">
                      <Form.Label>Pessoa com Deficiência</Form.Label>
                      <Form.Control as="select" value={values.attendeeDisabilityYN} onChange={(evt) => { evt.target.value = !!(evt.target.value === 'true' || evt.target.value === true); handleChange(evt) }} isValid={touched.attendeeDisabilityYN && !errors.attendeeDisabilityYN} isInvalid={touched.attendeeDisabilityYN && errors.attendeeDisabilityYN} >
                        <option value={false}>Não</option>
                        <option value={true}>Sim</option>
                      </Form.Control>
                      <Form.Control.Feedback type="invalid">{errors.attendeeDisabilityYN}</Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  {values.attendeeDisabilityYN === true || values.attendeeDisabilityYN === 'true' ?
                    (<div className="col col-12 col-lg-6">
                      <Form.Group className="mb-3" controlId="attendeeDisability">
                        <Form.Label>Descrever a Necessidade de Atendimento Especial</Form.Label>
                        <Form.Control type="text" value={values.attendeeDisability} onChange={handleChange} isValid={touched.attendeeDisability && !errors.attendeeDisability} isInvalid={touched.attendeeDisability && errors.attendeeDisability} />
                        <Form.Control.Feedback type="invalid">{errors.attendeeDisability}</Form.Control.Feedback>
                      </Form.Group>
                    </div>) : <></>
                  }
                </div>

                <FieldArray name="statement">
                  {({ insert, remove, push, pop }) => (
                    <div>
                      {values.statement.length > 0 && values.statement.map((s, i) =>
                      (
                        <div className="row" key={i}>
                          <div className="col col-12">
                            <h3>Enunciado {values.statement.length > 1 ? i + 1 : ''}</h3>
                          </div>

                          <div className="col col-12 col-lg-6">
                            <Form.Group className="mb-3" controlId={`statement[${i}].committee`}>
                              <Form.Label>Comissão</Form.Label>
                              <Form.Control as="select" onChange={(evt, i) => handleChange(evt, i)} isValid={touched.attendeeName && !(errors && errors.statement && errors.statement[i] && errors.statement[i].committee)} isInvalid={touched.attendeeName && errors && errors.statement && errors.statement[i] && errors.statement[i].committee}  >
                                <option value disabled selected hidden>[Selecione]</option>
                                <option value="1">Assuntos Fundiários</option>
                                <option value="2">Enfrentamento ao Assédio Moral e Sexual</option>
                                <option value="3">Saúde</option>
                              </Form.Control>
                              <Form.Control.Feedback type="invalid">{errors && errors.statement && errors.statement[i] && errors.statement[i].committee}</Form.Control.Feedback>
                            </Form.Group>
                          </div>

                          <div className="col align-self-end">
                            {i > 0 && i == (values.statement.length - 1) ?
                              <Button variant="secondary" onClick={() => pop()} className="mb-3" style={{ marginRight: '1em' }}>
                                Remover Enunciado {i + 1}
                              </Button>
                              : <></>}
                            {i == (values.statement.length - 1) && i < 2 ?
                              <Button variant="secondary" onClick={() => push({
                                text: '',
                                justification: '',
                                committee: undefined
                              })} className="mb-3">
                                Adicionar Enunciado {i + 2}
                              </Button>
                              : <></>}
                          </div>

                          <div className="w-100 d-none d-md-block"></div>
                          <div className="col col-12 col-md-6">
                            <Form.Group className="mb-3" controlId={`statement[${i}].text`}>
                              <Form.Label>Enunciado</Form.Label>
                              <Form.Control as="textarea" rows="10" onChange={(evt, i) => handleChange(evt, i)} isValid={touched.attendeeName && !(errors && errors.statement && errors.statement[i] && errors.statement[i].text)} isInvalid={touched.attendeeName && errors && errors.statement && errors.statement[i] && errors.statement[i].text} />
                              <Form.Control.Feedback type="invalid">{errors && errors.statement && errors.statement[i] && errors.statement[i].text}</Form.Control.Feedback>
                              <Form.Text className="text-muted">Escreva um texto de no máximo 800 caracteres.</Form.Text>
                            </Form.Group>
                          </div>
                          <div className="col col-12 col-md-6">
                            <Form.Group className="mb-3" controlId={`statement[${i}].justification`}>
                              <Form.Label>Justificativa</Form.Label>
                              <Form.Control as="textarea" rows="10" onChange={(evt, i) => handleChange(evt, i)} isValid={touched.attendeeName && !(errors && errors.statement && errors.statement[i] && errors.statement[i].justification)} isInvalid={touched.attendeeName && errors && errors.statement && errors.statement[i] && errors.statement[i].justification} />
                              <Form.Control.Feedback type="invalid">{errors && errors.statement && errors.statement[i] && errors.statement[i].justification}</Form.Control.Feedback>
                              <Form.Text className="text-muted">Escreva uma justificativa para o enunciado de no máximo 1600 caracteres.</Form.Text>
                            </Form.Group>
                          </div>
                        </div>
                      )

                      )}
                    </div>
                  )}
                </FieldArray>
                <div className="row" style={{ marginBottom: '6em' }}>
                  <div className="col"></div>
                  <div className="col col-auto">
                    <Button type="submit" variant="primary" className="ml-auto" disabled={isSubmitting}>
                      Enviar
                    </Button>
                  </div>
                </div>
                <ReCAPTCHA className="mt-5" ref={recaptchaRef} size="invisible" sitekey="6LdaLcQnAAAAAEMD67TvgcCck_qWMkXQefETSt2B" onChange={onChange} />
                <p className="text-muted d-none">This site is protected by reCAPTCHA and the Google <a href="https://policies.google.com/privacy">Privacy Policy</a> and <a href="https://policies.google.com/terms">Terms of Service</a> apply.</p>
              </Form>
            )}</Formik>
        </>
      }
    </Layout >
  )
}