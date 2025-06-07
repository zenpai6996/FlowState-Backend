import axios from 'axios';

export const validateEmailWithAbstract = async (email) => {
  try {
    const { data } = await axios.get("https://emailvalidation.abstractapi.com/v1/", {
      params: {
        api_key: process.env.ABSTRACT_API_KEY,
        email,
      },
    });

    return data.deliverability === "DELIVERABLE" && !data.is_disposable_email.value;
  } catch (err) {
    console.error("AbstractAPI email validation failed:", err.message);
    return false;
  }
};