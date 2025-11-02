import { useState } from "react";

const KickUserModal = ({ 
  kickTargetUser, 
  onConfirm, 
  onCancel, 
  isRemoving 
}) => {
  const [kickReason, setKickReason] = useState("");

  const handleConfirm = () => {
    onConfirm(kickReason);
    setKickReason("");
  };

  const handleCancel = () => {
    onCancel();
    setKickReason("");
  };

  if (!kickTargetUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="font-bold text-lg mb-4">Remove User from Stream</h3>
        <p className="mb-4">
          Are you sure you want to remove{" "}
          <span className="font-semibold">{kickTargetUser.name}</span> from
          the stream?
        </p>

        <fieldset className="fieldset mb-4">
          <label className="label" htmlFor="kick-reason">
            Reason (optional)
          </label>
          <textarea
            id="kick-reason"
            className="textarea h-24 w-full"
            placeholder="e.g., Disruptive behavior, inappropriate content, etc."
            value={kickReason}
            onChange={(e) => setKickReason(e.target.value)}
          />
        </fieldset>

        <div className="flex justify-end gap-2">
          <button
            className="btn btn-ghost"
            onClick={handleCancel}
            disabled={isRemoving}
          >
            Cancel
          </button>
          <button
            className="btn btn-error"
            onClick={handleConfirm}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Removing...
              </>
            ) : (
              "Remove User"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KickUserModal;
