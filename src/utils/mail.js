// import Mailgen from "mailgen"

// import nodemailer from "nodemailer"


// const sendEmail = async (options) => {
//     const mailGenerator = new Mailgen({
//         theme: "default",
//         product: {
//             name: "Task Manager",
//             link: "https://taskmanagelink.com"
//         }
//     })
//     const emailTextual = mailGenerator.generatePlainText(options.mailgenContent)
//     const emailHtml = mailGenerator.generate(options.mailgenContent)

//     const transporter = nodemailer.createTransport({
//         host: process.env.MAILTRAP_SMTP_HOST,
//         port: process.env.MAILTRAP_SMTP_PORT,
//         auth: {
//             user: process.env.MAILTRAP_SMTP_USER,
//             pass: process.env.MAILTRAP_SMTP_PASS
//         }
//     })
//     const mail = {
//         from: "mail.taskmanager@example.com",
//         to: options.email,
//         subject: options.subject,
//         text: emailTextual,
//         html: emailHtml
//     }
//     try {
//         await transporter.sendMail(mail)
//     } catch (error) {
//         console.error("Email service failed silently. Make sure that you have provided your MAILTRAP credentials in the .env file")
//         console.error("Error: ",error)
//     }
// }
// const emailVerificationMailgenContent = (useranme, verficationUrl) => {
//     return {
//       body: {
//         name: useranme,
//         intro: " Welcone to our App! we'are excited to have u to board.",
//         action: {
//           instructions:
//             "To verify your email please click on the following button",
//           button: {
//             color: "#22BC66",
//             text: "Verify your email",
//             link: verficationUrl,
//           },
//         },
//         outro:
//           "Need help, or have questions? Just reply to this email, we'd love to help.",
//       },
//     };
// }

// const forgotPasswordMailgenContent = (useranme, passwordResetUrl) => {
//   return {
//     body: {
//       name: useranme,
//       intro: "We got a request to reset the password of your account",
//       action: {
//         instructions:
//           "To reset your password click on the following button",
//         button: {
//           color: "#22BC66",
//           text: "Reset password",
//           link: passwordResetUrl,
//         },
//       },
//       outro:
//         "Need help, or have questions? Just reply to this email, we'd love to help.",
//     },
//   };
// };

// export {
//     emailVerificationMailgenContent,
//     forgotPasswordMailgenContent,
//     sendEmail
// };

import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link: "https://taskmanagelink.com",
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailHtml = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: '"Task Manager" <no-reply@taskmanager.com>',
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  };

  try {
    const info = await transporter.sendMail(mail);
    console.log("📧 Email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Email service failed");
    console.error(error);
  }
};

const emailVerificationMailgenContent = (username, verificationUrl) => ({
  body: {
    name: username,
    intro: "Welcome to our App! We're excited to have you on board.",
    action: {
      instructions: "To verify your email please click the button below",
      button: {
        color: "#22BC66",
        text: "Verify your email",
        link: verificationUrl,
      },
    },
    outro: "Need help? Just reply to this email.",
  },
});

const forgotPasswordMailgenContent = (username, passwordResetUrl) => ({
  body: {
    name: username,
    intro: "We received a request to reset your password",
    action: {
      instructions: "Click the button below to reset your password",
      button: {
        color: "#22BC66",
        text: "Reset password",
        link: passwordResetUrl,
      },
    },
    outro: "If you didn't request this, you can ignore this email.",
  },
});

export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
};
